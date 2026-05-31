#!/usr/bin/env python3
import argparse
import json
import os
import re
import warnings
from pathlib import Path

os_environ = os.environ
os_environ.setdefault("PYTHONWARNINGS", "ignore")
os_environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os_environ.setdefault("HF_HUB_DISABLE_XET", "1")
os_environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os_environ.setdefault("HF_HUB_ETAG_TIMEOUT", "10")
os_environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "120")

warnings.filterwarnings("ignore")

import whisperx  # noqa: E402


def emit_progress(progress, message):
    print(json.dumps({
        "type": "progress",
        "progress": int(progress),
        "message": message,
    }), flush=True)


def prefer_local_silero(cache_dir):
    silero_dir = cache_dir / "torch" / "hub" / "snakers4_silero-vad_master"
    if not silero_dir.exists():
        return

    import torch  # noqa: E402

    original_load = torch.hub.load

    def load(repo_or_dir, *args, **kwargs):
        if repo_or_dir == "snakers4/silero-vad":
            kwargs["source"] = "local"
            return original_load(str(silero_dir), *args, **kwargs)
        return original_load(repo_or_dir, *args, **kwargs)

    torch.hub.load = load


def configure_model_cache(cache_dir):
    hf_home = cache_dir / "hf-home"
    hf_hub = cache_dir / "huggingface"
    torch_home = cache_dir / "torch"

    for directory in (hf_home, hf_hub, torch_home, cache_dir / "align", cache_dir / "pyannote"):
        directory.mkdir(parents=True, exist_ok=True)

    os_environ["HF_HOME"] = str(hf_home)
    os_environ["HF_HUB_CACHE"] = str(hf_hub)
    os_environ["HUGGINGFACE_HUB_CACHE"] = str(hf_hub)
    os_environ["TRANSFORMERS_CACHE"] = str(hf_hub)
    os_environ["TORCH_HOME"] = str(torch_home)


def normalize_space(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def strip_ansi(value):
    return re.sub(r"\x1b\[[0-9;]*m", "", str(value or ""))


def normalize_speaker(value):
    return re.sub(r"[^A-Za-z0-9_:-]+", "_", str(value or "")).strip("_")


def find_hf_token(cache_dir):
    for key in ("HF_TOKEN", "HUGGINGFACE_TOKEN", "HUGGING_FACE_HUB_TOKEN"):
        token = os_environ.get(key, "").strip()
        if token:
            return token

    candidates = [
        cache_dir / "token",
        Path.home() / ".cache" / "huggingface" / "token",
        Path.home() / ".huggingface" / "token",
    ]
    for candidate in candidates:
        try:
            token = candidate.read_text(encoding="utf-8").strip()
        except OSError:
            continue
        if token:
            return token

    return ""


def collect_speakers(aligned):
    speakers = set()
    for segment in aligned.get("segments", []):
        speaker = normalize_speaker(segment.get("speaker"))
        if speaker:
            speakers.add(speaker)
        for word in segment.get("words", []):
            speaker = normalize_speaker(word.get("speaker"))
            if speaker:
                speakers.add(speaker)
    return sorted(speakers)


def diarization_status(error):
    message = normalize_space(strip_ansi(error))
    if "GatedRepoError" in message or "403" in message or "gated" in message.lower():
        return "pyannote_terms_not_accepted"
    if "RepositoryNotFoundError" in message or "401" in message:
        return "pyannote_access_denied"
    return "failed: " + message[:240]


def ensure_diarization_access(model_name, token, cache_dir):
    try:
        from huggingface_hub import hf_hub_download  # noqa: E402

        hf_hub_download(
            model_name,
            "config.yaml",
            repo_type="model",
            use_auth_token=token,
            cache_dir=str(cache_dir / "pyannote"),
        )
        return ""
    except Exception as error:
        return diarization_status(error)


def run_pyannote_diarization(audio, args, token, cache_dir):
    import pandas as pd  # noqa: E402
    import torch  # noqa: E402
    from pyannote.audio import Pipeline  # noqa: E402

    original_torch_load = torch.load

    def trusted_torch_load(*load_args, **load_kwargs):
        if load_kwargs.get("weights_only") is None:
            load_kwargs["weights_only"] = False
        return original_torch_load(*load_args, **load_kwargs)

    torch.load = trusted_torch_load

    model_name = args.diarization_model or "pyannote/speaker-diarization-3.1"
    pipeline = Pipeline.from_pretrained(
        model_name,
        use_auth_token=token,
        cache_dir=str(cache_dir / "pyannote"),
    )
    if pipeline is None:
        raise RuntimeError("pyannote_terms_not_accepted")

    device = torch.device(args.device)
    pipeline.to(device)
    audio_data = {
        "waveform": torch.from_numpy(audio[None, :]),
        "sample_rate": 16000,
    }
    diarization = pipeline(
        audio_data,
        min_speakers=args.min_speakers or None,
        max_speakers=args.max_speakers or None,
    )
    diarize_df = pd.DataFrame(
        diarization.itertracks(yield_label=True),
        columns=["segment", "label", "speaker"],
    )
    diarize_df["start"] = diarize_df["segment"].apply(lambda segment: segment.start)
    diarize_df["end"] = diarize_df["segment"].apply(lambda segment: segment.end)
    return diarize_df


def apply_diarization(aligned, audio, args, cache_dir):
    if args.diarize == "off":
        return aligned, {
            "enabled": False,
            "status": "disabled",
            "speakers": [],
        }

    token = find_hf_token(cache_dir)
    if not token:
        emit_progress(91, "Speaker detection skipped")
        return aligned, {
            "enabled": False,
            "status": "missing_hf_token",
            "speakers": [],
        }

    model_name = args.diarization_model or "pyannote/speaker-diarization-3.1"
    access_status = ensure_diarization_access(model_name, token, cache_dir)
    if access_status:
        emit_progress(91, "Speaker detection skipped")
        return aligned, {
            "enabled": False,
            "status": access_status,
            "speakers": [],
        }

    try:
        from whisperx.diarize import assign_word_speakers  # noqa: E402

        emit_progress(91, "Loading speaker detection")
        emit_progress(92, "Detecting speakers")
        diarize_segments = run_pyannote_diarization(audio, args, token, cache_dir)

        emit_progress(93, "Assigning speakers")
        aligned = assign_word_speakers(
            diarize_segments,
            aligned,
            fill_nearest=True,
        )
        speakers = collect_speakers(aligned)
        return aligned, {
            "enabled": True,
            "status": "ok" if speakers else "no_speakers_detected",
            "speakers": speakers,
        }
    except Exception as error:
        emit_progress(91, "Speaker detection skipped")
        return aligned, {
            "enabled": False,
            "status": diarization_status(error),
            "speakers": [],
        }


def build_segments(aligned):
    segments = []

    for index, segment in enumerate(aligned.get("segments", []), start=1):
        words = []
        for word in segment.get("words", []):
            text = normalize_space(word.get("word", ""))
            if not text:
                continue

            start = word.get("start")
            end = word.get("end")
            if start is None or end is None:
                continue

            start = float(start)
            end = float(end)
            if end < start:
                end = start

            word_data = {
                "start": start,
                "end": end,
                "text": text,
            }
            speaker = normalize_speaker(word.get("speaker"))
            if speaker:
                word_data["speaker"] = speaker
            words.append(word_data)

        segment_text = normalize_space(segment.get("text", ""))
        segment_start = segment.get("start")
        segment_end = segment.get("end")
        segment_speaker = normalize_speaker(segment.get("speaker"))

        if segment_start is None and words:
            segment_start = words[0]["start"]
        if segment_end is None and words:
            segment_end = words[-1]["end"]

        segment_start = float(segment_start or 0.0)
        segment_end = float(segment_end or segment_start)
        if segment_end <= segment_start:
            segment_end = segment_start + 0.04

        if not segment_text and words:
            segment_text = " ".join(word["text"] for word in words)

        segment_data = {
            "index": index,
            "start": segment_start,
            "end": segment_end,
            "text": segment_text,
            "words": words,
        }
        if segment_speaker:
            segment_data["speaker"] = segment_speaker
        segments.append(segment_data)

    if not segments and aligned.get("word_segments"):
        segments = build_segments_from_words(aligned.get("word_segments", []))

    return segments


def build_segments_from_words(word_segments):
    words = []
    for word in word_segments:
        text = normalize_space(word.get("word", ""))
        if not text:
            continue

        start = word.get("start")
        end = word.get("end")
        if start is None or end is None:
            continue

        start = float(start)
        end = float(end)
        if end < start:
            end = start

        word_data = {
            "start": start,
            "end": end,
            "text": text,
        }
        speaker = normalize_speaker(word.get("speaker"))
        if speaker:
            word_data["speaker"] = speaker
        words.append(word_data)

    if not words:
        return []

    segments = []
    current_words = []
    current_start = words[0]["start"]
    previous_end = words[0]["end"]

    def flush():
        nonlocal current_words, current_start, previous_end
        if not current_words:
            return
        segment_text = normalize_space(" ".join(word["text"] for word in current_words))
        if segment_text:
            segments.append({
                "index": len(segments) + 1,
                "start": current_start,
                "end": max(previous_end, current_start + 0.04),
                "text": segment_text,
                "words": current_words,
            })
        current_words = []

    for word in words:
        gap = word["start"] - previous_end
        current_text = " ".join(item["text"] for item in current_words)
        should_split = (
            bool(current_words)
            and (gap > 0.8 or len(current_words) >= 12 or len(current_text) >= 70)
        )
        if should_split:
            flush()
            current_start = word["start"]
        elif not current_words:
            current_start = word["start"]

        current_words.append(word)
        previous_end = max(previous_end, word["end"])

    flush()
    return segments


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-path", required=True)
    parser.add_argument("--output-base", required=True)
    parser.add_argument("--summary-path", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--language", default="")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--compute-type", default="int8")
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--cache-dir", default="")
    parser.add_argument("--vad-method", default="silero")
    parser.add_argument("--vad-onset", type=float, default=0.35)
    parser.add_argument("--vad-offset", type=float, default=0.25)
    parser.add_argument("--local-files-only", action="store_true")
    parser.add_argument("--diarize", choices=("auto", "off"), default="auto")
    parser.add_argument("--diarization-model", default="")
    parser.add_argument("--min-speakers", type=int, default=0)
    parser.add_argument("--max-speakers", type=int, default=0)
    args = parser.parse_args()

    output_base = Path(args.output_base)
    summary_path = Path(args.summary_path)
    raw_json_path = output_base.with_suffix(".json")
    cache_dir = Path(args.cache_dir).expanduser() if args.cache_dir else output_base.parent / ".whisperx-cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    configure_model_cache(cache_dir)
    prefer_local_silero(cache_dir)

    emit_progress(24, "Loading audio")
    audio = whisperx.load_audio(args.audio_path)
    emit_progress(28, "Audio loaded")
    transcribe_language = args.language or None
    if transcribe_language == "auto":
        transcribe_language = None

    emit_progress(32, "Loading WhisperX model")
    model = whisperx.load_model(
        args.model,
        args.device,
        compute_type=args.compute_type,
        language=transcribe_language,
        vad_method=args.vad_method,
        vad_options={
            "vad_onset": args.vad_onset,
            "vad_offset": args.vad_offset,
        },
        download_root=str(cache_dir / "huggingface"),
        local_files_only=args.local_files_only,
    )
    emit_progress(46, "WhisperX model ready")
    emit_progress(52, "Transcribing")
    result = model.transcribe(audio, batch_size=args.batch_size, language=transcribe_language)
    detected_language = result.get("language") or args.language or "en"

    emit_progress(72, "Loading alignment model")
    align_model, metadata = whisperx.load_align_model(
        language_code=detected_language,
        device=args.device,
        model_dir=str(cache_dir / "align"),
    )
    emit_progress(82, "Aligning words")
    aligned = whisperx.align(
        result["segments"],
        align_model,
        metadata,
        audio,
        args.device,
        return_char_alignments=False,
    )
    emit_progress(90, "Alignment ready")

    aligned, diarization = apply_diarization(aligned, audio, args, cache_dir)

    raw_json_path.write_text(json.dumps(aligned, ensure_ascii=False, indent=2), encoding="utf-8")
    emit_progress(94, "Writing transcript")

    segments = build_segments(aligned)
    duration = 0.0
    word_count = 0
    for segment in segments:
        if segment["end"] > duration:
            duration = segment["end"]
        word_count += len(segment.get("words", []))

    summary = {
        "backend": "whisperx",
        "language": detected_language,
        "duration": duration,
        "wordCount": word_count,
        "segments": segments,
        "rawJsonPath": str(raw_json_path),
        "diarization": diarization,
    }
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
