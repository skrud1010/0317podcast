## Podcast Language Lab (MVP)

영어 학습용 팟캐스트를 기반으로 **듣기 → 이해 → 쓰기 → 피드백**까지 한 번에 진행할 수 있는 MVP 웹 앱입니다.

- 소스: BBC 6 Minute English, VOA Learning English Podcast
- 백엔드: FastAPI (Python)
- 프론트엔드: React (CDN, 간단 SPA)

### 1. 환경 변수

루트 디렉터리에 `.env` 파일을 만들고 다음 값을 설정하세요.

```bash
OPENAI_API_KEY=sk-...
```

### 2. 백엔드 실행

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

기본 포트는 `http://localhost:8000` 입니다.

### 3. 프론트엔드 실행

간단히 정적 파일 서버로 열 수 있습니다. 예:

```bash
cd frontend
python -m http.server 5173
```

그리고 브라우저에서 `http://localhost:5173` 접속 후 사용합니다.

> 필요하다면 별도의 React 빌드 툴(vite 등)로 마이그레이션 가능합니다.

### 4. 주요 플로우

1. 소스 선택 (BBC / VOA)
2. 에피소드 선택
3. 오디오 스트리밍 재생 (원본 URL 직접 사용, 파일 저장 없음)
4. STT(Whisper)로 transcript 생성
5. OpenAI로 요약 및 객관식 퀴즈 생성
6. 퀴즈 풀이 → 점수 / 정답 하이라이트
7. 사용자가 영어로 요약 작성 → OpenAI가 유사도 점수 및 피드백 제공

