from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
import os
import io
import re
from urllib.parse import unquote, quote
import feedparser
import httpx
from dotenv import load_dotenv
from openai import OpenAI


class Episode(BaseModel):
    id: str
    title: str
    description: str
    audio_url: str
    published: str | None = None


class TranscriptRequest(BaseModel):
    audio_url: str


class AnalyzeRequest(BaseModel):
    transcript: str


class AnalyzeExtendedRequest(BaseModel):
    transcript: str
    summary: str | None = None


class AnalyzeResponse(BaseModel):
    summary: str
    questions: list[dict]
    reading_passage: str | None = None
    reading_questions: list[dict] | None = None
    key_sentences: list[dict] | None = None
    vocab: list[dict] | None = None


class WritingFeedbackRequest(BaseModel):
    user_text: str
    reference_summary: str


class WritingFeedbackResponse(BaseModel):
    feedback: str
    similarity_score: int


class SpeakingFeedbackResponse(BaseModel):
    pronunciation_score: int
    intonation_score: int
    speed_score: int
    overall_score: int
    transcript: str
    feedback: str


class LearningCommentRequest(BaseModel):
    listening_score: int | None = None
    reading_score: int | None = None
    writing_score: int | None = None
    speaking_score: int | None = None


load_dotenv()

RSS_SOURCES = {
    "bbc_6min": {
        "name": "BBC 6 Minute English",
        "rss": "https://podcasts.files.bbci.co.uk/p02pc9tn.rss",
        "mode": "rss",
    },
}


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY 환경 변수가 설정되어 있지 않습니다.")

client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI(title="Podcast Language Learning API")

# 변경 이유: Vercel(프론트) + Railway(백엔드) 분리 배포 시 허용 오리진을 환경변수로 안전하게 관리
frontend_origins_env = os.getenv("FRONTEND_ORIGINS", "")
allow_origins = [o.strip() for o in frontend_origins_env.split(",") if o.strip()]
if not allow_origins:
    allow_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ]

allow_origin_regex = os.getenv(
    "FRONTEND_ORIGIN_REGEX",
    r"https://.*\.vercel\.app",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/sources")
async def list_sources():
    return [
        {"id": key, "name": meta["name"]}
        for key, meta in RSS_SOURCES.items()
    ]


@app.get("/api/episodes")
async def list_episodes(source_id: str, request: Request):
    if source_id not in RSS_SOURCES:
        raise HTTPException(status_code=404, detail="알 수 없는 소스 ID 입니다.")

    mode = RSS_SOURCES[source_id].get("mode", "rss")

    if mode == "rss":
        rss_url = RSS_SOURCES[source_id]["rss"]
        feed = feedparser.parse(rss_url)

        episodes: list[Episode] = []
        for entry in feed.entries:
            audio_url = None
            # enclosure에서 오디오 URL 추출 (VOA 등은 entry.link가 HTML인 경우가 많음)
            if "links" in entry:
                for link in entry.links:
                    if getattr(link, "rel", "") == "enclosure" and "audio" in getattr(link, "type", ""):
                        audio_url = link.href
                        break

            # enclosure가 없을 때만 link를 fallback으로 사용
            if not audio_url and getattr(entry, "link", None):
                audio_url = entry.link

            if not audio_url:
                continue

            # 변경 이유: 배포(https) 환경에서 mixed content 차단을 피하려고 오디오 URL을 https로 정규화
            if audio_url.startswith("http://"):
                audio_url = "https://" + audio_url[len("http://"):]

            # 변경 이유: 최종 리다이렉트가 http로 떨어지는 BBC 오디오를 백엔드 https 프록시로 우회
            base_url = str(request.base_url).rstrip("/")
            proxied_audio_url = f"{base_url}/api/audio-proxy?url={quote(audio_url, safe='')}"

            episodes.append(
                Episode(
                    id=getattr(entry, "id", getattr(entry, "guid", entry.link)),
                    title=entry.title,
                    description=getattr(entry, "summary", ""),
                    audio_url=proxied_audio_url,
                    published=getattr(entry, "published", None),
                )
            )

        return episodes

    raise HTTPException(status_code=500, detail="지원하지 않는 소스 모드입니다.")


@app.get("/api/audio-proxy")
async def audio_proxy(url: str, request: Request):
    """외부 오디오를 HTTPS API 경유로 전달."""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; LearnCast/1.0)",
    }
    range_header = request.headers.get("range")
    if range_header:
        headers["Range"] = range_header

    timeout = httpx.Timeout(60.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, headers=headers) as client_http:
        try:
            resp = await client_http.get(url)
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"오디오 프록시 요청 실패: {e}") from e

    passthrough_headers = {}
    for key in ["content-type", "content-length", "content-range", "accept-ranges", "cache-control"]:
        val = resp.headers.get(key)
        if val:
            passthrough_headers[key] = val

    return Response(content=resp.content, status_code=resp.status_code, headers=passthrough_headers)


def guess_ext_from_url(url: str) -> str:
    url_l = url.lower()
    for ext in (".mp3", ".m4a", ".mp4", ".wav", ".ogg", ".webm"):
        if ext in url_l:
            return ext
    return ".mp3"


def guess_ext_from_content_type(content_type: str | None) -> str:
    if not content_type:
        return ".mp3"
    ct = content_type.lower().split(";")[0].strip()
    return {
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/mp4": ".m4a",
        "audio/x-m4a": ".m4a",
        "audio/wav": ".wav",
        "audio/ogg": ".ogg",
        "audio/webm": ".webm",
    }.get(ct, ".mp3")


async def fetch_audio_bytes(url: str) -> tuple[bytes, str | None]:
    # 일부 CDN/사이트는 User-Agent가 없으면 연결을 끊거나 403/404를 줄 수 있어 기본 헤더를 설정
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
    }
    timeout = httpx.Timeout(60.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, headers=headers) as client_http:
        try:
            resp = await client_http.get(url)
        except httpx.HTTPError as e:
            raise HTTPException(status_code=400, detail=f"오디오 요청 실패: {e}")
        if resp.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"오디오를 가져오지 못했습니다. status={resp.status_code}",
            )
        return resp.content, resp.headers.get("content-type")


@app.post("/api/transcribe")
async def transcribe(req: TranscriptRequest):
    # 오디오는 디스크에 저장하지 않고 메모리에서만 처리
    audio_bytes, content_type = await fetch_audio_bytes(req.audio_url)
    audio_file = io.BytesIO(audio_bytes)
    # Whisper는 파일 확장자(컨테이너) 추정에 민감할 수 있어 URL/Content-Type 기반으로 확장자를 맞춘다
    ext = guess_ext_from_content_type(content_type)
    if ext == ".mp3":
        ext = guess_ext_from_url(req.audio_url)
    audio_file.name = f"audio{ext}"

    try:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT 처리 중 오류: {e}")

    # verbose_json: text + segments(start/end/text) 제공
    text = getattr(result, "text", None) or (result.get("text") if isinstance(result, dict) else "")
    segments_raw = getattr(result, "segments", None) or (result.get("segments") if isinstance(result, dict) else [])

    segments = []
    for s in segments_raw or []:
        if isinstance(s, dict):
            start = float(s.get("start", 0))
            end = float(s.get("end", 0))
            seg_text = str(s.get("text", "")).strip()
        else:
            start = float(getattr(s, "start", 0))
            end = float(getattr(s, "end", 0))
            seg_text = str(getattr(s, "text", "")).strip()
        if seg_text:
            segments.append({"start": start, "end": end, "text": seg_text})

    return {"transcript": text, "segments": segments}


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    if not req.transcript.strip():
        raise HTTPException(status_code=400, detail="빈 transcript 입니다.")

    core = await analyze_core(req)
    extended = await analyze_extended(
        AnalyzeExtendedRequest(transcript=req.transcript, summary=core["summary"])
    )

    return AnalyzeResponse(
        summary=core["summary"],
        questions=core["questions"],
        reading_passage=extended["reading_passage"],
        reading_questions=extended["reading_questions"],
        key_sentences=extended["key_sentences"],
        vocab=extended["vocab"],
    )


@app.post("/api/analyze-core")
async def analyze_core(req: AnalyzeRequest):
    if not req.transcript.strip():
        raise HTTPException(status_code=400, detail="빈 transcript 입니다.")

    prompt = (
        "다음 팟캐스트 대본을 분석해 JSON 객체 하나만 반환하세요.\n"
        '{ "summary": "영어 3~5문장 요약", "questions": ['
        '{"question":"...","options":["A","B","C","D"],"correctIndex":1}'
        "] }\n"
        "questions는 듣기 이해 문제 3~5개, 질문/보기는 영어로 작성하세요."
    )
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "영어 팟캐스트 요약과 듣기 문제를 빠르게 생성하는 튜터입니다. JSON만 출력하세요.",
                },
                {"role": "user", "content": f"{prompt}\n\n대본:\n{req.transcript}"},
            ],
            temperature=0.5,
        )
        raw = resp.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"핵심 분석(요약/듣기문제) 중 오류: {e}")

    import json

    summary = ""
    questions: list[dict] = []
    try:
        obj = json.loads(raw)
        if isinstance(obj, dict):
            summary = str(obj.get("summary", "")).strip()
            q = obj.get("questions")
            if isinstance(q, list):
                questions = q
    except Exception:
        # 모델이 JSON 외 텍스트를 섞을 때를 대비해 가장 큰 JSON 블록을 재파싱
        m = re.search(r"\{[\s\S]*\}", raw)
        if m:
            try:
                obj = json.loads(m.group(0))
                if isinstance(obj, dict):
                    summary = str(obj.get("summary", "")).strip()
                    q = obj.get("questions")
                    if isinstance(q, list):
                        questions = q
            except Exception:
                pass

    # 최종 보정: 응답이 비어 있으면 기존 방식으로 한 번 더 안전 생성
    if not summary or not questions:
        try:
            summary_resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "영어 요약 어시스턴트입니다. 3~5문장으로 영어 요약만 작성하세요.",
                    },
                    {"role": "user", "content": req.transcript},
                ],
                temperature=0.4,
            )
            summary = (summary_resp.choices[0].message.content or "").strip()
            quiz_resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "영어 듣기 문제를 JSON 배열로만 반환하세요."},
                    {
                        "role": "user",
                        "content": (
                            "요약을 기반으로 객관식 문제 3~5개를 만드세요. "
                            "형식: "
                            '[{"question":"...","options":["A","B","C","D"],"correctIndex":1}]\n'
                            f"요약:\n{summary}"
                        ),
                    },
                ],
                temperature=0.6,
            )
            raw_quiz = (quiz_resp.choices[0].message.content or "").strip()
            try:
                q_obj = json.loads(raw_quiz)
                if isinstance(q_obj, list):
                    questions = q_obj
            except Exception:
                pass
        except Exception:
            pass
    return {"summary": summary, "questions": questions}


@app.post("/api/analyze-extended")
async def analyze_extended(req: AnalyzeExtendedRequest):
    if not req.transcript.strip():
        raise HTTPException(status_code=400, detail="빈 transcript 입니다.")

    enrich_prompt = (
        "다음 팟캐스트 요약과 전체 대본을 바탕으로 학습용 자료를 생성하세요.\n"
        "JSON 객체 하나만 반환하세요. 형식은 다음과 같습니다.\n"
        '{\n'
        '  "reading_passage": "현재 에피소드 핵심 내용을 재구성한 짧은 영어 지문(120~180단어)",\n'
        '  "reading_questions": [\n'
        '    {"question": "...", "options": ["A","B","C","D"], "correctIndex": 1}\n'
        "  ],\n"
        '  "key_sentences": [\n'
        '    {\n'
        '      "text": "핵심 문장 원문(영어)",\n'
        '      "translation": "한국어 해석",\n'
        '      "cloze": {\n'
        '        "sentence": "두세 단어가 ____ 로 가려진 문장",\n'
        '        "answers": ["정답단어1", "정답단어2"]\n'
        "      }\n"
        "    }\n"
        "  ],\n"
        '  "vocab": [\n'
        '    {\n'
        '      "word": "표현",\n'
        '      "meaning": "간단한 뜻(한국어)",\n'
        '      "example": "예문(영어)",\n'
        '      "from_sentence": "원문에서 이 단어가 포함된 문장"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "reading_questions는 reading_passage 기반으로 3~4개, key_sentences는 4~6개, vocab은 5~10개로 만드세요. "
        "key_sentences.text와 cloze.sentence, cloze.answers는 반드시 영어로 작성하세요."
    )
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "영어 쓰기/읽기/말하기/어휘 학습 자료를 설계하는 튜터입니다."},
                {
                    "role": "user",
                    "content": (
                        f"{enrich_prompt}\n\n요약:\n{req.summary or ''}\n\n전체 대본:\n{req.transcript}"
                    ),
                },
            ],
            temperature=0.6,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"확장 분석(쓰기/읽기/말하기/어휘) 중 오류: {e}")

    import json

    raw = resp.choices[0].message.content.strip()
    reading_passage = ""
    reading_questions: list[dict] = []
    key_sentences: list[dict] = []
    vocab: list[dict] = []
    try:
        obj = json.loads(raw)
        if isinstance(obj, dict):
            rp = obj.get("reading_passage")
            rq = obj.get("reading_questions")
            ks = obj.get("key_sentences")
            vc = obj.get("vocab")
            if isinstance(rp, str):
                reading_passage = rp.strip()
            if isinstance(rq, list):
                reading_questions = rq
            if isinstance(ks, list):
                key_sentences = ks
            if isinstance(vc, list):
                vocab = vc
    except Exception:
        pass
    return {
        "reading_passage": reading_passage,
        "reading_questions": reading_questions,
        "key_sentences": key_sentences,
        "vocab": vocab,
    }


@app.post("/api/writing-feedback", response_model=WritingFeedbackResponse)
async def writing_feedback(req: WritingFeedbackRequest):
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "당신은 영어 작문 피드백을 주는 교사입니다. "
                        "학습자의 문장을 참고 요약문과 비교해 유사도(0~100)를 점수로 주고, "
                        "간단한 피드백(영어와 한국어 혼합 가능)을 작성하세요. "
                        "JSON 형식으로만 답변하세요. "
                        '예: {"score": 78, "feedback": "..."}'
                    ),
                },
                {
                    "role": "user",
                    "content": f"참고 요약:\n{req.reference_summary}\n\n학습자 문장:\n{req.user_text}",
                },
            ],
            temperature=0.4,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"피드백 생성 중 오류: {e}")

    import json

    raw = resp.choices[0].message.content.strip()
    try:
        data = json.loads(raw)
        score = int(data.get("score", 0))
        feedback = str(data.get("feedback", ""))
    except Exception:
        score = 0
        feedback = "피드백을 생성하는 중 문제가 발생했습니다. 다시 시도해 주세요."

    score = max(0, min(100, score))
    return WritingFeedbackResponse(feedback=feedback, similarity_score=score)


@app.post("/api/speaking-feedback", response_model=SpeakingFeedbackResponse)
async def speaking_feedback(
    audio_file: UploadFile = File(...),
    target_text: str = Form(...),
    duration_sec: float = Form(0.0),
):
    # 오디오를 메모리에서만 처리해 Whisper STT에 전달
    try:
        audio_bytes = await audio_file.read()
        in_mem = io.BytesIO(audio_bytes)
        in_mem.name = audio_file.filename or "recording.webm"
        stt_result = client.audio.transcriptions.create(
            model="whisper-1",
            file=in_mem,
            response_format="text",
            language="en",
        )
        user_transcript = str(stt_result).strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"말하기 STT 처리 중 오류: {e}")

    # 발화 속도(단어/분) 기반 보조 점수 계산
    words = re.findall(r"[A-Za-z']+", user_transcript)
    wpm = (len(words) / max(duration_sec, 1e-6)) * 60 if duration_sec and duration_sec > 0 else 0
    if not words:
        base_speed_score = 20
    elif wpm < 90:
        base_speed_score = 60
    elif wpm <= 170:
        base_speed_score = 90
    elif wpm <= 210:
        base_speed_score = 75
    else:
        base_speed_score = 55

    prompt = (
        "영어 쉐도잉 평가 결과를 JSON으로만 반환하세요.\n"
        '형식: {"pronunciation_score":0~100,"intonation_score":0~100,"speed_score":0~100,'
        '"overall_score":0~100,"feedback":"한국어 2~3문장"}\n'
        "평가 기준:\n"
        "- pronunciation: 목표 문장 대비 발화 정확도(단어 누락/오인식 포함)\n"
        "- intonation: 억양/리듬 추정(문장 부호·강세 어색함 등을 기반으로 보수적으로 평가)\n"
        "- speed: 아래 base_speed_score를 참고해 최종 보정\n"
        f"- base_speed_score={base_speed_score}, measured_wpm={round(wpm, 1)}\n"
    )

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "당신은 영어 말하기 코치입니다. JSON 외 텍스트를 절대 출력하지 마세요.",
                },
                {
                    "role": "user",
                    "content": (
                        f"{prompt}\n\n"
                        f"[목표 문장]\n{target_text}\n\n"
                        f"[학습자 발화 STT]\n{user_transcript}"
                    ),
                },
            ],
            temperature=0.3,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"말하기 분석 중 오류: {e}")

    import json

    raw = resp.choices[0].message.content.strip()
    try:
        data = json.loads(raw)
        pronunciation_score = int(data.get("pronunciation_score", 0))
        intonation_score = int(data.get("intonation_score", 0))
        speed_score = int(data.get("speed_score", base_speed_score))
        overall_score = int(data.get("overall_score", 0))
        feedback = str(data.get("feedback", "")).strip()
    except Exception:
        pronunciation_score = 0
        intonation_score = 0
        speed_score = int(base_speed_score)
        overall_score = int((pronunciation_score + intonation_score + speed_score) / 3)
        feedback = "평가를 생성하는 중 문제가 발생했습니다. 다시 시도해 주세요."

    pronunciation_score = max(0, min(100, pronunciation_score))
    intonation_score = max(0, min(100, intonation_score))
    speed_score = max(0, min(100, speed_score))
    overall_score = max(0, min(100, overall_score))
    if not overall_score:
        overall_score = int((pronunciation_score + intonation_score + speed_score) / 3)

    return SpeakingFeedbackResponse(
        pronunciation_score=pronunciation_score,
        intonation_score=intonation_score,
        speed_score=speed_score,
        overall_score=overall_score,
        transcript=user_transcript,
        feedback=feedback or "발화를 반복 연습하며 정확도를 높여 보세요.",
    )


@app.post("/api/learning-comment")
async def learning_comment(req: LearningCommentRequest):
    # 수행한 세션 점수만 반영해 짧은 학습 코멘트를 생성
    payload = {
        "listening": req.listening_score,
        "reading": req.reading_score,
        "writing": req.writing_score,
        "speaking": req.speaking_score,
    }
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "당신은 영어 학습 코치입니다. 입력 점수를 바탕으로 한국어 한 문단(2~3문장)으로 "
                        "강점 1개와 다음 학습 액션 1개를 제시하세요."
                    ),
                },
                {"role": "user", "content": f"점수 데이터: {payload}"},
            ],
            temperature=0.4,
        )
        comment = (resp.choices[0].message.content or "").strip()
    except Exception:
        comment = "학습 기록이 쌓이고 있어요. 낮은 점수 영역을 우선 10분씩 반복하면 전체 실력이 빠르게 올라갑니다."
    return {"comment": comment}


@app.get("/health")
async def health():
    # 키 자체를 노출하지 않고, .env 로딩/환경변수 주입이 정상인지 여부만 반환
    return {"status": "ok", "openai_configured": bool(os.getenv("OPENAI_API_KEY"))}

