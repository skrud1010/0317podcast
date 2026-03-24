// 간단한 React 앱 (CDN 사용, Babel로 JSX 변환)
const { useState, useEffect, useMemo } = React;

// 변경 이유: 로컬/배포(Vercel+Railway) 환경에서 API 주소를 자동으로 분기
const PROD_API_BASE = "https://0317podcast-production.up.railway.app";
const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : PROD_API_BASE;

const BBC_PROGRAM = {
  id: "bbc_6min",
  name: "BBC 6 Minute English",
  subtitle: "6–7분 짧은 학습용 에피소드",
};

function formatEpisodeDateParts(published) {
  if (!published) return { dateLabel: "", timeLabel: "", detailDate: "" };
  const d = new Date(published);
  if (Number.isNaN(d.getTime())) {
    return { dateLabel: published, timeLabel: "", detailDate: published };
  }
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const weekday = weekdays[d.getUTCDay()];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const detailDate = `${weekday}, ${day} ${month} ${year}`;
  return {
    dateLabel: detailDate,
    timeLabel: `${hh}:${mm}`,
    detailDate,
  };
}

function EpisodesView({
  episodes,
  loading,
  onSelectEpisode,
  sortOrder,
  onSortOrderChange,
  topicFilter,
  onTopicFilterChange,
  variant,
}) {
  const isBare = variant === "bare";
  const sortedFiltered = useMemo(() => {
    let list = [...episodes];
    // published 문자열을 Date로 변환 (없으면 그대로)
    list.sort((a, b) => {
      const da = a.published ? new Date(a.published) : null;
      const db = b.published ? new Date(b.published) : null;
      if (!da || !db) return 0;
      return sortOrder === "newest" ? db - da : da - db;
    });

    if (topicFilter.trim()) {
      const q = topicFilter.toLowerCase();
      list = list.filter(
        (e) =>
          (e.title || "").toLowerCase().includes(q) ||
          (e.description || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [episodes, sortOrder, topicFilter]);

  const WrapperStart = isBare ? "div" : "div";
  const wrapperClass = isBare ? "episodes-bare" : "card";

  return (
    <div className={wrapperClass}>
      {isBare ? (
        <div className="episodes-bare__banner">
          <div className="episodes-bare__hero">
            <img className="episodes-bare__cover" src="./bbc_cover.png" alt="BBC 6 Minute English cover" />
            <div className="episodes-bare__hero-text">
              <h2>에피소드 목록</h2>
              <p className="muted">BBC 6 Minuite English</p>
            </div>
          </div>
          <div className="episode-filters episode-filters--bare">
            <div className="episode-filters__group">
              <button
                className={"pill pill--ghost" + (sortOrder === "newest" ? " pill--active" : "")}
                onClick={() => onSortOrderChange("newest")}
              >
                최신순
              </button>
              <button
                className={"pill pill--ghost" + (sortOrder === "oldest" ? " pill--active" : "")}
                onClick={() => onSortOrderChange("oldest")}
              >
                오래된순
              </button>
            </div>
            <div className="episode-filters__group">
              <input
                className="topic-input"
                placeholder="키워드로 제목/설명 검색"
                value={topicFilter}
                onChange={(e) => onTopicFilterChange(e.target.value)}
              />
            </div>
          </div>
          {!loading && (
            <div className="episode-list__head episode-list__head--bare">
              <div>제목</div>
              <div>날짜</div>
              <div>재생시간</div>
            </div>
          )}
        </div>
      ) : (
        <>
          <h2>에피소드</h2>
          <p className="muted">{BBC_PROGRAM.name}</p>
          <div className="episode-filters">
            <div className="episode-filters__group">
              <span className="label">정렬</span>
              <button
                className={"pill pill--ghost" + (sortOrder === "newest" ? " pill--active" : "")}
                onClick={() => onSortOrderChange("newest")}
              >
                최신순
              </button>
              <button
                className={"pill pill--ghost" + (sortOrder === "oldest" ? " pill--active" : "")}
                onClick={() => onSortOrderChange("oldest")}
              >
                오래된순
              </button>
            </div>
            <div className="episode-filters__group">
              <span className="label">주제 검색</span>
              <input
                className="topic-input"
                placeholder="키워드로 제목/설명 검색"
                value={topicFilter}
                onChange={(e) => onTopicFilterChange(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <div className={"episode-list" + (isBare ? " episode-list--bare" : "")}>
            {!isBare && (
              <div className="episode-list__head">
                <div>제목</div>
                <div>날짜</div>
                <div>재생시간</div>
              </div>
            )}
            {sortedFiltered.map((e) => {
              const parts = formatEpisodeDateParts(e.published);
              return (
                <button
                  key={e.id}
                  type="button"
                  className={"episode-item" + (isBare ? " episode-item--bare" : "")}
                  onClick={() => onSelectEpisode(e)}
                >
                  <div className="episode-item__titleCol">
                    <span className="episode-item__play" aria-hidden="true">
                      ▶
                    </span>
                    <span className="episode-item__title">{e.title}</span>
                  </div>
                  <div className="episode-item__meta">{parts.dateLabel}</div>
                  <div className="episode-item__time">{parts.timeLabel}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SidebarEpisodes({
  episodes,
  loading,
  sortOrder,
  onSortOrderChange,
  topicFilter,
  onTopicFilterChange,
  selectedEpisodeId,
  onSelectEpisode,
}) {
  const filteredSorted = useMemo(() => {
    let list = [...episodes];

    list.sort((a, b) => {
      const da = a.published ? new Date(a.published) : null;
      const db = b.published ? new Date(b.published) : null;
      if (!da || !db) return 0;
      return sortOrder === "newest" ? db - da : da - db;
    });

    if (topicFilter.trim()) {
      const q = topicFilter.toLowerCase();
      list = list.filter(
        (e) =>
          (e.title || "").toLowerCase().includes(q) ||
          (e.description || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [episodes, sortOrder, topicFilter]);

  return (
    <div className="sidebar__episodes">
      <div className="sidebar__episodes-title-row">
        <div className="sidebar__episodes-title">에피소드</div>
        <div className="sidebar__episodes-sort">
          <button
            className={
              "pill pill--ghost pill--small" +
              (sortOrder === "newest" ? " pill--active" : "")
            }
            onClick={() => onSortOrderChange("newest")}
          >
            최신순
          </button>
          <button
            className={
              "pill pill--ghost pill--small" +
              (sortOrder === "oldest" ? " pill--active" : "")
            }
            onClick={() => onSortOrderChange("oldest")}
          >
            오래된순
          </button>
        </div>
      </div>

      <input
        className="sidebar__topic-input"
        placeholder="주제 검색"
        value={topicFilter}
        onChange={(e) => onTopicFilterChange(e.target.value)}
      />

      {loading ? (
        <div className="sidebar__episodes-loading">불러오는 중...</div>
      ) : (
        <div className="sidebar__episodes-list">
          {filteredSorted.map((e) => (
            <button
              key={e.id}
              className={
                "sidebar__episode-item" +
                (selectedEpisodeId === e.id ? " sidebar__episode-item--active" : "")
              }
              onClick={() => onSelectEpisode(e)}
            >
              <div className="sidebar__episode-item__title">{e.title}</div>
              <div className="sidebar__episode-item__meta">{e.published || ""}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerView({
  episode,
  transcriptSegments,
  subtitleOn,
  onToggleSubtitle,
  onTranscribe,
  loadingTranscribe,
  summary,
  showEpisodeSummary,
}) {
  const [t, setT] = useState(0);
  const [audioError, setAudioError] = useState("");
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = React.useRef(null);
  const segRefs = React.useRef([]);
  // 변경 이유: 현재 재생 구간 자막이 보이도록 스크롤 영역을 따라가게 함

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const handler = () => setT(el.currentTime || 0);
    const errHandler = () => {
      setAudioError(
        "이 에피소드는 원본 서버에서 오디오 파일을 찾을 수 없어 재생할 수 없습니다."
      );
    };
    el.addEventListener("timeupdate", handler);
    el.addEventListener("error", errHandler);
    return () => {
      el.removeEventListener("timeupdate", handler);
      el.removeEventListener("error", errHandler);
    };
  }, []);

  const activeIdx = useMemo(() => {
    if (!subtitleOn || !transcriptSegments?.length) return -1;
    for (let i = 0; i < transcriptSegments.length; i += 1) {
      const s = transcriptSegments[i];
      if (t >= s.start && t < s.end) return i;
    }
    return -1;
  }, [t, subtitleOn, transcriptSegments]);

  useEffect(() => {
    if (activeIdx < 0 || !subtitleOn) return;
    const el = segRefs.current[activeIdx];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [activeIdx, subtitleOn]);

  const seekToSegment = (seg) => {
    if (!audioRef.current || !seg) return;
    audioRef.current.currentTime = Number(seg.start || 0);
    audioRef.current.play().catch(() => {});
  };

  const handleChangePlaybackRate = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  if (!episode) return null;
  const publishedParts = formatEpisodeDateParts(episode.published);

  return (
    <div className="card episode-player-card">
      {/* 변경 이유: 에피소드 재생 화면 제목만 크게·가운데 정렬 */}
      <h2 className="episode-player-card__title">{episode.title}</h2>
      <p className="muted episode-player-card__meta">{publishedParts.detailDate}</p>

      <audio
        ref={audioRef}
        controls
        controlsList="nodownload noplaybackrate"
        src={episode.audio_url}
        style={{ width: "100%" }}
      />

      {audioError && <div className="warning-banner">{audioError}</div>}

      <div className="audio-tools">
        <span className="audio-tools__label">재생 속도</span>
        <div className="audio-tools__rates">
          {[0.5, 0.8, 1.0, 1.2, 1.5].map((r) => (
            <button
              key={r}
              className={"pill pill--small" + (playbackRate === r ? " pill--active" : "")}
              onClick={() => handleChangePlaybackRate(r)}
            >
              {r.toFixed(1)}x
            </button>
          ))}
        </div>
      </div>

      <div className="controls-row">
        <div className="controls-group">
          <button className={"pill pill--control" + (subtitleOn ? " pill--active" : "")} onClick={onToggleSubtitle}>
            자막 {subtitleOn ? "ON" : "OFF"}
          </button>
          <button className="primary-btn pill--control" onClick={onTranscribe} disabled={loadingTranscribe}>
            {loadingTranscribe ? "자막 생성 중..." : "자막 생성"}
          </button>
        </div>
      </div>

      {subtitleOn && (
        <div className="transcript-box transcript-box--karaoke">
          {transcriptSegments?.length ? (
            transcriptSegments.map((s, idx) => (
              <span
                key={idx}
                ref={(el) => {
                  segRefs.current[idx] = el;
                }}
                className={"seg" + (idx === activeIdx ? " seg--active" : "")}
                onClick={() => seekToSegment(s)}
                title="해당 시점으로 이동"
                style={{ cursor: "pointer" }}
              >
                {s.text + " "}
              </span>
            ))
          ) : (
            <p className="muted">아직 자막이 없습니다. “자막 생성(STT)”를 눌러주세요.</p>
          )}
        </div>
      )}

      {showEpisodeSummary && summary && (
        <section className="episode-summary">
          <h3>요약</h3>
          <p>{summary}</p>
        </section>
      )}
    </div>
  );
}

function ReadingQuizSection({ passage, questions, onScore, hasTranscript }) {
  // 변경 이유: 읽기 탭에서 STT 원문 대신 에피소드 기반 AI 지문 + 문제풀이를 제공하기 위함
  const [answers, setAnswers] = useState({});
  const [scored, setScored] = useState(false);
  const safeQuestions = questions || [];

  if (!passage) {
    return (
      <div className="card">
        <h2>읽기 모드</h2>
        <p className="muted">
          {hasTranscript
            ? "읽기 지문/문제 생성중입니다. 잠시만 기다려 주세요."
            : "에피소드 화면에서 자막 생성(STT)을 먼저 진행해 주세요."}
        </p>
      </div>
    );
  }

  const total = safeQuestions.length;
  const answeredCount = Object.keys(answers).length;
  const isFinished = total > 0 && answeredCount === total;
  let score = null;

  if (isFinished && scored) {
    let correct = 0;
    safeQuestions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correct += 1;
    });
    score = { correct, total };
  }

  return (
    <div className="card">
      <h2>읽기 모드</h2>
      <div className="transcript-box">
        <p>{passage}</p>
      </div>

      {safeQuestions.length > 0 && (
        <div className="quiz-section" style={{ marginTop: "0.75rem" }}>
          <h3>지문 이해 문제</h3>
          {safeQuestions.map((q, idx) => (
            <div key={idx} className="quiz-question">
              <p className="quiz-question__title">
                {idx + 1}. {q.question}
              </p>
              <div className="quiz-options">
                {(q.options || []).map((opt, oi) => {
                  const selected = answers[idx] === oi;
                  let cls = "quiz-option";
                  if (selected) cls += " quiz-option--selected";
                  if (scored && oi === q.correctIndex) cls += " quiz-option--correct";
                  if (scored && selected && oi !== q.correctIndex) cls += " quiz-option--wrong";
                  return (
                    <button
                      key={oi}
                      className={cls}
                      onClick={() => !scored && setAnswers((prev) => ({ ...prev, [idx]: oi }))}
                    >
                      <span className="quiz-option__label">{String.fromCharCode(65 + oi)}</span>
                      <span>{String(opt || "").replace(/^[A-D]\s*[\.\)]\s*/i, "")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="score-box">
            <span>
              {answeredCount}/{total} answered
            </span>
            <button
              className="primary-btn small"
              disabled={!isFinished}
              onClick={() => {
                setScored(true);
                if (typeof onScore === "function" && total > 0) {
                  let correct = 0;
                  safeQuestions.forEach((q, idx) => {
                    if (answers[idx] === q.correctIndex) correct += 1;
                  });
                  onScore(Math.round((correct / total) * 100));
                }
              }}
            >
              채점하기
            </button>
          </div>
          {score && (
            <div className="score-box">
              Score: {score.correct} / {score.total}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuizSection({ questions, answers, onAnswer, onRetry, onScore, hasTranscript }) {
  const [scored, setScored] = React.useState(false);
  const safeQuestions = questions || [];

  if (!safeQuestions.length) {
    return (
      <div className="card">
        <h2>듣기 퀴즈</h2>
        <p className="muted">
          {hasTranscript
            ? "듣기 문제 생성중입니다. 잠시만 기다려 주세요."
            : "에피소드 화면에서 자막 생성(STT)을 먼저 진행해 주세요."}
        </p>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const total = safeQuestions.length || 0;
  const isFinished = total > 0 && answeredCount === total;

  let score = null;
  if (isFinished && scored) {
    let correct = 0;
    safeQuestions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correct += 1;
    });
    score = { correct, total };
  }

  return (
    <div className="card">
      <h2>듣기 퀴즈</h2>

      <section className="quiz-section">
        <h3 className="visually-hidden">객관식</h3>
        {safeQuestions.map((q, qIdx) => (
          <div key={qIdx} className="quiz-question">
            <p className="quiz-question__title">
              {qIdx + 1}. {q.question}
            </p>
            <div className="quiz-options">
              {q.options.map((opt, oIdx) => {
                const selected = answers[qIdx] === oIdx;
                const isCorrect = q.correctIndex === oIdx;
                const showColors = isFinished && scored;

                let cls = "quiz-option";
                if (selected) cls += " quiz-option--selected";
                if (showColors && isCorrect) cls += " quiz-option--correct";
                if (showColors && selected && !isCorrect)
                  cls += " quiz-option--wrong";

                return (
                  <button
                    key={oIdx}
                    className={cls}
                    onClick={() => !isFinished && onAnswer(qIdx, oIdx)}
                  >
                    <span className="quiz-option__label">{String.fromCharCode(65 + oIdx)}</span>
                    <span>{String(opt || "").replace(/^[A-D]\s*[\.\)]\s*/i, "")}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {score && (
          <div className="score-box">
            Score: {score.correct} / {score.total}
            <button className="secondary-btn small" onClick={onRetry}>
              Retry incorrect
            </button>
          </div>
        )}

        <div className="score-box">
          <span>
            {answeredCount}/{total} answered
          </span>
          <button
            className="primary-btn small"
            disabled={!isFinished}
            onClick={() => {
              let correct = 0;
              safeQuestions.forEach((q, idx) => {
                if (answers[idx] === q.correctIndex) correct += 1;
              });
              setScored(true);
              if (typeof onScore === "function" && total > 0) {
                onScore(Math.round((correct / total) * 100));
              }
            }}
          >
            채점하기
          </button>
        </div>
      </section>
    </div>
  );
}

function WritingSection({ referenceSummary, onFeedback, feedback, loading }) {
  // 변경 이유: 핵심 문장 빈칸 채우기와 내용 재구성 작성을 한 화면에서 수행하기 위함
  const [text, setText] = useState("");
  const [clozeAnswers, setClozeAnswers] = useState({});
  const [checked, setChecked] = useState(false);
  const safeSentences = referenceSummary?.keySentences || [];
  const canScoreWriting = Boolean(referenceSummary?.summary?.trim());

  const clozeTotal = safeSentences.length;
  let clozeCorrect = 0;
  safeSentences.forEach((s, idx) => {
    const expected = (s?.cloze?.answers || []).join(" ").trim().toLowerCase();
    const user = (clozeAnswers[idx] || "").trim().toLowerCase();
    if (expected && expected === user) clozeCorrect += 1;
  });

  return (
    <div className="card">
      <h2>쓰기 연습</h2>
      {safeSentences.length > 0 && (
        <div className="quiz-section">
          <h3>핵심 문장 빈칸 채우기</h3>
          {safeSentences.map((s, idx) => (
            <div key={idx} className="quiz-question">
              <p className="quiz-question__title">
                {idx + 1}. {s.cloze?.sentence || s.text}
              </p>
              <input
                className="cloze-input"
                placeholder="Type the missing English words"
                value={clozeAnswers[idx] || ""}
                onChange={(e) =>
                  setClozeAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
                }
              />
              {checked && (
                <>
                  <p className="muted">
                    정답: {(s?.cloze?.answers || []).join(" / ") || "정답 정보 없음"}
                  </p>
                  {s.translation && <p className="muted">해석: {s.translation}</p>}
                </>
              )}
            </div>
          ))}
          <div className="score-box">
            <span>
              {Object.keys(clozeAnswers).length}/{clozeTotal} answered
            </span>
            <button className="secondary-btn small" onClick={() => setChecked(true)}>
              정답 확인
            </button>
          </div>
          {checked && (
            <div className="score-box">
              빈칸 점수: {clozeCorrect} / {clozeTotal}
            </div>
          )}
        </div>
      )}

      <h3>핵심 내용 재구성 작성</h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="에피소드 핵심 내용을 영어로 4~6문장 정도로 재구성해 작성하세요..."
      />
      <div className="writing-actions">
        <button
          className="primary-btn"
          disabled={!text.trim() || loading || !canScoreWriting}
          onClick={() => onFeedback(text)}
        >
          {loading ? "피드백 생성 중..." : "AI 피드백 받기"}
        </button>
      </div>
      {feedback && (
        <div className="feedback-box">
          <h3>피드백</h3>
          <p>
            <strong>유사도:</strong> {feedback.similarity_score} / 100
          </p>
          <p>{feedback.feedback}</p>
        </div>
      )}
    </div>
  );
}

function SpeakingSection({ keySentences, onSpeakingScored, hasTranscript }) {
  // 변경 이유: 쉐도잉 녹음 후 발음/억양/속도 점수를 제공하기 위함
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const recorderRef = React.useRef(null);
  const chunksRef = React.useRef([]);
  const startAtRef = React.useRef(0);
  const elapsedMsRef = React.useRef(0);
  const isPausedRef = React.useRef(false);
  const shouldAnalyzeRef = React.useRef(true);
  const restartAfterStopRef = React.useRef(false);

  const sentence = keySentences?.[selectedIdx]?.text || "";

  const startRecording = async () => {
    setError("");
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const durationSec = Math.max(0, elapsedMsRef.current / 1000);
        stream.getTracks().forEach((t) => t.stop());
        const shouldAnalyze = shouldAnalyzeRef.current;
        const shouldRestart = restartAfterStopRef.current;
        shouldAnalyzeRef.current = true;
        restartAfterStopRef.current = false;
        elapsedMsRef.current = 0;
        startAtRef.current = 0;
        if (!shouldAnalyze) {
          if (shouldRestart) {
            await startRecording();
          }
          return;
        }
        await analyzeSpeaking(blob, durationSec);
      };
      recorderRef.current = recorder;
      startAtRef.current = Date.now();
      elapsedMsRef.current = 0;
      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      isPausedRef.current = false;
    } catch (e) {
      console.error(e);
      setError("마이크 권한이 필요합니다. 브라우저에서 마이크 허용 후 다시 시도해 주세요.");
    }
  };

  const pauseRecording = () => {
    if (!recorderRef.current || recorderRef.current.state !== "recording") return;
    elapsedMsRef.current += Date.now() - startAtRef.current;
    recorderRef.current.pause();
    setIsPaused(true);
    isPausedRef.current = true;
  };

  const resumeRecording = () => {
    if (!recorderRef.current || recorderRef.current.state !== "paused") return;
    startAtRef.current = Date.now();
    recorderRef.current.resume();
    setIsPaused(false);
    isPausedRef.current = false;
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;
    if (!isPausedRef.current && startAtRef.current > 0) {
      elapsedMsRef.current += Date.now() - startAtRef.current;
    }
    recorderRef.current.stop();
    setIsRecording(false);
    setIsPaused(false);
    isPausedRef.current = false;
  };

  const retryRecording = () => {
    setResult(null);
    setError("");
    if (isRecording && recorderRef.current) {
      shouldAnalyzeRef.current = false;
      restartAfterStopRef.current = true;
      recorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      isPausedRef.current = false;
      return;
    }
    chunksRef.current = [];
    elapsedMsRef.current = 0;
    startAtRef.current = 0;
  };

  const analyzeSpeaking = async (blob, durationSec) => {
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("audio_file", blob, "shadowing.webm");
      form.append("target_text", sentence);
      form.append("duration_sec", String(durationSec));
      const res = await fetch(API_BASE + "/api/speaking-feedback", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("speaking analyze failed");
      const data = await res.json();
      setResult(data);
      if (typeof onSpeakingScored === "function") {
        onSpeakingScored(data.overall_score, data);
      }
    } catch (e) {
      console.error(e);
      setError("말하기 분석 중 오류가 발생했습니다. 백엔드 상태와 마이크 권한을 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (!keySentences?.length) {
    return (
      <div className="card">
        <h2>말하기 모드</h2>
        <p className="muted">
          {hasTranscript
            ? "말하기 문제 생성중입니다. 잠시만 기다려 주세요."
            : "에피소드 화면에서 자막 생성(STT)을 먼저 진행해 주세요."}
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>말하기 모드</h2>
      <p className="muted">아래 핵심 문장을 보고 쉐도잉한 뒤 녹음 분석을 실행하세요.</p>

      <div className="shadowing-sentences">
        {keySentences.map((s, idx) => (
          <button
            key={idx}
            className={"shadowing-item" + (idx === selectedIdx ? " shadowing-item--active" : "")}
            onClick={() => {
              setSelectedIdx(idx);
              setResult(null);
              setError("");
            }}
          >
            {idx + 1}. {s.text}
          </button>
        ))}
      </div>

      <div className="record-row">
        {!isRecording ? (
          <button className="primary-btn" onClick={startRecording} disabled={loading}>
            녹음하기
          </button>
        ) : (
          <>
            {!isPaused ? (
              <button className="secondary-btn" onClick={pauseRecording}>
                일시정지
              </button>
            ) : (
              <button className="secondary-btn" onClick={resumeRecording}>
                이어서 녹음
              </button>
            )}
            <button className="secondary-btn" onClick={stopRecording}>
              녹음 종료
            </button>
          </>
        )}
        <button className="secondary-btn" onClick={retryRecording} disabled={loading}>
          다시 녹음하기
        </button>
        {isRecording && <span className="muted">녹음 중...</span>}
        {isPaused && <span className="muted">일시정지됨</span>}
        {loading && <span className="muted">분석 중...</span>}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {result && (
        <div className="feedback-box">
          <h3>쉐도잉 분석 결과</h3>
          <p>발음: {result.pronunciation_score} / 100</p>
          <p>억양: {result.intonation_score} / 100</p>
          <p>속도: {result.speed_score} / 100</p>
          <p>
            <strong>종합: {result.overall_score} / 100</strong>
          </p>
          <p className="muted">인식 문장: {result.transcript}</p>
          <p>{result.feedback}</p>
        </div>
      )}
    </div>
  );
}

function StatsSection({ history, coachComment }) {
  const sessions = [
    { key: "listening", label: "듣기" },
    { key: "writing", label: "쓰기" },
    { key: "reading", label: "읽기" },
    { key: "speaking", label: "말하기" },
  ];
  const available = sessions.filter((s) => typeof history[s.key] === "number");
  const commentText = String(coachComment || "");
  const strengthsMatch = commentText.match(/강점:\s*([\s\S]*?)(?:다음 학습 액션:|$)/);
  const actionMatch = commentText.match(/다음 학습 액션:\s*([\s\S]*)$/);
  const strengthsText = strengthsMatch ? strengthsMatch[1].trim() : "";
  const actionText = actionMatch ? actionMatch[1].trim() : "";
  const plainComment = !strengthsText && !actionText ? commentText : "";

  return (
    <div className="card">
      <h2>학습 관리</h2>
      {available.length === 0 ? (
        <p className="muted">아직 기록된 세션이 없습니다. 학습모드를 수행하면 결과가 누적됩니다.</p>
      ) : (
        <div className="stats-list">
          {available.map((s) => (
            <div key={s.key} className="stats-item stats-item--card">
              <div className="stats-item__row">
                <strong>{s.label}</strong>
                <span>{history[s.key]}점</span>
              </div>
              <div className="stats-bar">
                <div className="stats-bar__fill" style={{ width: `${history[s.key]}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {coachComment && (
        <div className="feedback-box" style={{ marginTop: "0.8rem" }}>
          <h3>AI 코멘트</h3>
          {plainComment ? (
            <p>{plainComment}</p>
          ) : (
            <div className="coach-comment">
              <div className="coach-comment__block">
                <div className="coach-comment__title">강점</div>
                <p>{strengthsText || "-"}</p>
              </div>
              <div className="coach-comment__block">
                <div className="coach-comment__title">다음 학습 액션</div>
                <p>{actionText || "-"}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  // 변경 이유: 에피소드 재생 화면과 학습모드(문제풀이)·학습관리 화면을 명확히 분리하기 위함
  const [sources, setSources] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [mainView, setMainView] = useState("home"); // home | episodes
  const [activeTab, setActiveTab] = useState("listening");
  const [mode, setMode] = useState("browse"); // browse(에피소드 재생만) | learn(학습모드 문제) | manage(학습관리)
  const [sortOrder, setSortOrder] = useState("newest");
  const [topicFilter, setTopicFilter] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [transcript, setTranscript] = useState("");
  const [transcriptSegments, setTranscriptSegments] = useState([]);
  const [subtitleOn, setSubtitleOn] = useState(true);
  const [summary, setSummary] = useState("");
  const [questions, setQuestions] = useState([]);
  const [readingPassage, setReadingPassage] = useState("");
  // 변경 이유: 학습모드(쓰기/읽기/말하기/어휘)에서 사용할 에피소드 기반 문제/자료 상태 추가
  const [keySentences, setKeySentences] = useState([]);
  const [readingQuestions, setReadingQuestions] = useState([]);
  const [vocab, setVocab] = useState([]);
  const [answers, setAnswers] = useState({});
  const [writingFeedback, setWritingFeedback] = useState(null);
  const [history, setHistory] = useState({
    listening: null,
    writing: null,
    reading: null,
    speaking: null,
  });
  const [coachComment, setCoachComment] = useState("");

  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [loadingTranscribe, setLoadingTranscribe] = useState(false);
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingExtended, setLoadingExtended] = useState(false);
  const [loadingWriting, setLoadingWriting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(API_BASE + "/api/sources")
      .then((r) => r.json())
      .then(setSources)
      .catch((e) => {
        console.error(e);
        setError("소스 목록을 불러오지 못했습니다. (백엔드 실행/포트 확인)");
      });
  }, []);

  useEffect(() => {
    // BBC 한 프로그램만 사용하므로 소스 목록이 오면 바로 에피소드 로드
    if (!sources.length) return;
    setLoadingEpisodes(true);
    setEpisodes([]);
    setSelectedEpisode(null);
    setTranscript("");
    setTranscriptSegments([]);
    setSummary("");
    setQuestions([]);
    setReadingPassage("");
    setKeySentences([]);
    setReadingQuestions([]);
    setVocab([]);
    setLoadingExtended(false);
    setAnswers({});
    setWritingFeedback(null);
    setHistory({ listening: null, writing: null, reading: null, speaking: null });
    setCoachComment("");

    fetch(API_BASE + "/api/episodes?source_id=bbc_6min")
      .then((r) => {
        if (!r.ok) throw new Error("episode fetch failed");
        return r.json();
      })
      .then((data) => setEpisodes(data))
      .catch((e) => {
        console.error(e);
        setError("에피소드 목록을 불러오지 못했습니다.");
      })
      .finally(() => setLoadingEpisodes(false));
  }, [sources.length]);

  const sortedFilteredEpisodes = useMemo(() => {
    let list = [...episodes];
    list.sort((a, b) => {
      const da = a.published ? new Date(a.published) : null;
      const db = b.published ? new Date(b.published) : null;
      if (!da || !db) return 0;
      return sortOrder === "newest" ? db - da : da - db;
    });
    if (topicFilter.trim()) {
      const q = topicFilter.toLowerCase();
      list = list.filter(
        (e) =>
          (e.title || "").toLowerCase().includes(q) ||
          (e.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [episodes, sortOrder, topicFilter]);

  const topEpisode = sortedFilteredEpisodes[0] || null;

  const runCoreAnalyze = async (transcriptText) => {
    if (!transcriptText?.trim()) return "";
    setLoadingAnalyze(true);
    const res = await fetch(API_BASE + "/api/analyze-core", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: transcriptText }),
    });
    if (!res.ok) throw new Error("core analyze failed");
    const data = await res.json();
    setSummary(data.summary || "");
    setQuestions(data.questions || []);
    setAnswers({});
    return data.summary || "";
  };

  const runExtendedAnalyze = async (transcriptText, summaryText) => {
    if (!transcriptText?.trim()) return;
    setLoadingExtended(true);
    try {
      const res = await fetch(API_BASE + "/api/analyze-extended", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptText, summary: summaryText || "" }),
      });
      if (!res.ok) throw new Error("extended analyze failed");
      const ext = await res.json();
      setReadingPassage(ext.reading_passage || "");
      setKeySentences(ext.key_sentences || []);
      setReadingQuestions(ext.reading_questions || []);
      setVocab(ext.vocab || []);
    } finally {
      setLoadingExtended(false);
    }
  };

  const handleTranscribe = async () => {
    if (!selectedEpisode) return;
    setLoadingTranscribe(true);
    setError("");
    try {
      const res = await fetch(API_BASE + "/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_url: selectedEpisode.audio_url }),
      });
      if (!res.ok) throw new Error("transcribe failed");
      const data = await res.json();
      const transcriptText = data.transcript || "";
      setTranscript(transcriptText);
      setTranscriptSegments(data.segments || []);

      const summaryText = await runCoreAnalyze(transcriptText);
      runExtendedAnalyze(transcriptText, summaryText).catch((e) => {
        console.error(e);
        setError("확장 문제(쓰기/읽기/말하기/어휘) 생성중입니다. 잠시 후 다시 확인해 주세요.");
      });
    } catch (e) {
      console.error(e);
      setError("STT / 분석 중 오류가 발생했습니다. (오디오 URL 또는 OpenAI 키 확인)");
    } finally {
      setLoadingTranscribe(false);
      setLoadingAnalyze(false);
    }
  };

  useEffect(() => {
    if (!selectedEpisode) return;
    if (mode !== "learn") return;
    if (activeTab === "stats") return;

    const hasTranscript = Boolean(transcriptSegments.length || transcript);

    // 변경 이유: 학습 탭 이동 시 STT/문제 생성이 자동으로 이어지도록 보장
    if (!hasTranscript && !loadingTranscribe) {
      handleTranscribe();
      return;
    }

    if (hasTranscript && !loadingAnalyze && (!summary || !questions.length)) {
      runCoreAnalyze(transcript)
        .then((summaryText) => {
          if (!loadingExtended && (!readingPassage || !keySentences.length || !readingQuestions.length || !vocab.length)) {
            return runExtendedAnalyze(transcript, summaryText);
          }
          return null;
        })
        .catch((e) => {
          console.error(e);
          setError("듣기 문제 생성중입니다. 잠시 후 다시 확인해 주세요.");
        });
      return;
    }

    const needsExtended =
      activeTab !== "listening" &&
      (!readingPassage || !keySentences.length || !readingQuestions.length || !vocab.length);
    if (hasTranscript && needsExtended && !loadingExtended) {
      runExtendedAnalyze(transcript, summary).catch((e) => {
        console.error(e);
        setError("문제 생성중입니다. 잠시 후 다시 확인해 주세요.");
      });
    }
  }, [selectedEpisode, mode, activeTab]);

  const handleAnswer = (qIdx, oIdx) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: oIdx }));
  };

  const handleRetryIncorrect = () => {
    const newAnswers = {};
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) {
        newAnswers[idx] = answers[idx];
      }
    });
    setAnswers(newAnswers);
  };

  const handleWritingFeedback = async (text) => {
    setLoadingWriting(true);
    setError("");
    try {
      const res = await fetch(API_BASE + "/api/writing-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_text: text,
          reference_summary: summary,
        }),
      });
      if (!res.ok) throw new Error("writing feedback failed");
      const data = await res.json();
      setWritingFeedback(data);
      setHistory((prev) => ({ ...prev, writing: data.similarity_score }));
    } catch (e) {
      console.error(e);
      setError("Writing 피드백 요청 중 오류가 발생했습니다.");
    } finally {
      setLoadingWriting(false);
    }
  };

  const handleSetSessionScore = (sessionKey, score) => {
    setHistory((prev) => ({ ...prev, [sessionKey]: score }));
  };

  useEffect(() => {
    const run = async () => {
      const hasAny =
        typeof history.listening === "number" ||
        typeof history.reading === "number" ||
        typeof history.writing === "number" ||
        typeof history.speaking === "number";
      if (!hasAny) {
        setCoachComment("");
        return;
      }
      try {
        const res = await fetch(API_BASE + "/api/learning-comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listening_score: history.listening,
            reading_score: history.reading,
            writing_score: history.writing,
            speaking_score: history.speaking,
          }),
        });
        if (!res.ok) throw new Error("learning comment failed");
        const data = await res.json();
        setCoachComment(data.comment || "");
      } catch (e) {
        console.error(e);
        setCoachComment("학습 결과가 누적되고 있습니다. 가장 낮은 영역부터 짧게 반복 학습해 보세요.");
      }
    };
    run();
  }, [history.listening, history.reading, history.writing, history.speaking]);

  return (
    <div className={"shell" + (sidebarOpen ? " shell--sidebar-open" : "")}>
      <aside
        className="sidebar"
        onClick={(e) => {
          if (window.innerWidth <= 860 && e.target.closest("button")) {
            setSidebarOpen(false);
          }
        }}
      >
        <button
          className="sidebar__logo"
          onClick={() => {
            // 홈 버튼: 에피소드 선택 해제 + 첫 탭(듣기)로 이동
            setSelectedEpisode(null);
            setMainView("home");
            setActiveTab("listening");
            setMode("browse");
          }}
        >
          LearnCast
        </button>

        <button
          className={"sidebar__item" + (mainView === "episodes" && !selectedEpisode ? " sidebar__item--active" : "")}
          onClick={() => {
            setSelectedEpisode(null);
            setMainView("episodes");
            setActiveTab("listening");
            setMode("browse");
          }}
        >
          에피소드
        </button>

        <div className="sidebar__section">학습모드</div>
        <div className="sidebar__learn-items">
          <button
            className={
              "sidebar__item" +
              (mode === "learn" && selectedEpisode && activeTab === "listening"
                ? " sidebar__item--active"
                : "")
            }
            onClick={() => {
              // 변경 이유: 에피소드 미선택시 목록으로만 보내고, 선택 후에는 학습모드(듣기) 화면으로 전환
              if (!selectedEpisode) {
                setMainView("episodes");
                setMode("browse");
              } else {
                setMode("learn");
              }
              setActiveTab("listening");
            }}
          >
            듣기
          </button>
          <button
            className={
              "sidebar__item" +
              (mode === "learn" && selectedEpisode && activeTab === "writing"
                ? " sidebar__item--active"
                : "")
            }
            onClick={() => {
              // 변경 이유: 에피소드 미선택시 목록으로만 보내고, 선택 후에는 학습모드(쓰기) 화면으로 전환
              if (!selectedEpisode) {
                setMainView("episodes");
                setMode("browse");
              } else {
                setMode("learn");
              }
              setActiveTab("writing");
            }}
          >
            쓰기
          </button>
          <button
            className={
              "sidebar__item" +
              (mode === "learn" && selectedEpisode && activeTab === "reading"
                ? " sidebar__item--active"
                : "")
            }
            onClick={() => {
              // 변경 이유: 에피소드 미선택시 목록으로만 보내고, 선택 후에는 학습모드(읽기) 화면으로 전환
              if (!selectedEpisode) {
                setMainView("episodes");
                setMode("browse");
              } else {
                setMode("learn");
              }
              setActiveTab("reading");
            }}
          >
            읽기
          </button>
          <button
            className={
              "sidebar__item" +
              (mode === "learn" && selectedEpisode && activeTab === "speaking"
                ? " sidebar__item--active"
                : "")
            }
            onClick={() => {
              // 변경 이유: 에피소드 미선택시 목록으로만 보내고, 선택 후에는 학습모드(말하기) 화면으로 전환
              if (!selectedEpisode) {
                setMainView("episodes");
                setMode("browse");
              } else {
                setMode("learn");
              }
              setActiveTab("speaking");
            }}
          >
            말하기
          </button>
          <button
            className={
              "sidebar__item" +
              (mode === "learn" && selectedEpisode && activeTab === "vocab"
                ? " sidebar__item--active"
                : "")
            }
            onClick={() => {
              // 변경 이유: 에피소드 미선택시 목록으로만 보내고, 선택 후에는 학습모드(어휘) 화면으로 전환
              if (!selectedEpisode) {
                setMainView("episodes");
                setMode("browse");
              } else {
                setMode("learn");
              }
              setActiveTab("vocab");
            }}
          >
            어휘
          </button>
          <button
            className={
              "sidebar__item" +
              (mode === "manage" && selectedEpisode && activeTab === "stats"
                ? " sidebar__item--active"
                : "")
            }
            onClick={() => {
              // 변경 이유: 학습관리는 에피소드 재생 없이 기록만 보는 모드로 분리
              if (!selectedEpisode) {
                setMainView("episodes");
                setMode("browse");
              } else {
                setMode("manage");
              }
              setActiveTab("stats");
            }}
          >
            학습관리
          </button>
        </div>
      </aside>

      <div className="page">
        <button
          className="mobile-sidebar-toggle"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
        >
          {sidebarOpen ? "✕" : "☰"}
        </button>
        {sidebarOpen && <div className="mobile-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
        {/* 변경 이유: 에피소드 재생/학습 화면에서는 상단 헤더(홈·LearnCast·브레드크럼)를 쓰지 않음 */}
        {!selectedEpisode && (
          <header className="page-header">
            {mainView === "home" ? (
              <div className="home-header">
                <div className="home-brand home-brand--static">LearnCast</div>
                <div className="home-hero">
                  <div className="home-hero__imgWrap">
                    <img
                      className="home-hero__img"
                      src="./bbc_cover.png"
                      alt="BBC 6 Minute English"
                    />
                    <button
                      className="home-hero__play"
                      aria-label="에피소드 페이지로 이동"
                      disabled={loadingEpisodes || !episodes.length}
                      onClick={() => {
                        setError("");
                        setSelectedEpisode(null);
                        setMainView("episodes");
                        setActiveTab("listening");
                        setMode("browse");
                        setTranscript("");
                        setTranscriptSegments([]);
                        setSummary("");
                        setQuestions([]);
                        setReadingPassage("");
                        setKeySentences([]);
                        setReadingQuestions([]);
                        setVocab([]);
                        setAnswers({});
                        setWritingFeedback(null);
                        setSubtitleOn(true);
                      }}
                    >
                      <span aria-hidden="true">▶</span>
                      <span>에피소드 재생</span>
                    </button>
                  </div>
                  <div className="home-hero__title">
                    6 Minute English
                    <div className="home-hero__title2">BBC Learning English</div>
                  </div>
                  {/* 변경 이유: 요청한 줄바꿈·들여쓰기를 유지하며 가운데 정렬(white-space: pre-line) */}
                  <div className="home-hero__desc home-hero__desc--pre">
                    {`If you want to improve your English, simply listening isn’t enough.
This app turns podcast content into an active learning experience,
helping you build real skills through listening, speaking, and writing.
With short, engaging episodes, you’ll learn everyday expressions, expand your vocabulary,
and understand how English is used in real conversations.
Interactive exercises, summaries, and transcripts help you stay focused and reinforce what you’ve learned.
From daily conversations to current topics, each lesson is designed to help you
 practice consistently and become a more confident and fluent English speaker.`}
                  </div>
                </div>
              </div>
            ) : (
              null
            )}
          </header>
        )}

        {error && <div className="error-banner">{error}</div>}

        <main className="layout">
          <div className="layout-main">
            {!selectedEpisode && mainView === "episodes" && (
              <EpisodesView
                episodes={episodes}
                loading={loadingEpisodes}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                topicFilter={topicFilter}
                onTopicFilterChange={setTopicFilter}
                variant="bare"
                onSelectEpisode={(ep) => {
                  setError("");
                  setSelectedEpisode(ep);
                  setMainView("episodes");
                  setActiveTab("listening");
                  setMode("browse");
                  setTranscript("");
                  setTranscriptSegments([]);
                  setSummary("");
                  setQuestions([]);
                  setReadingPassage("");
                  setKeySentences([]);
                  setReadingQuestions([]);
                  setVocab([]);
                  setLoadingExtended(false);
                  setAnswers({});
                  setWritingFeedback(null);
                  setSubtitleOn(true);
                }}
              />
            )}
            {!selectedEpisode && mainView === "home" && (
              <div style={{ height: "0.25rem" }} />
            )}

            {/* 에피소드 상세 + 탭별 콘텐츠 */}
            {selectedEpisode && (
              <>
                {/* 변경 이유: 에피소드 모드에서는 재생/자막만, 학습모드에서는 상단 재생 + 하단 문제 */}
                {(mode === "browse" || (mode === "learn" && activeTab !== "stats")) && (
                  <PlayerView
                    episode={selectedEpisode}
                    transcriptSegments={transcriptSegments}
                    subtitleOn={subtitleOn}
                    onToggleSubtitle={() => setSubtitleOn((v) => !v)}
                    onTranscribe={handleTranscribe}
                    loadingTranscribe={loadingTranscribe || loadingAnalyze}
                    summary={summary}
                    showEpisodeSummary={mode === "browse"}
                  />
                )}

                {mode === "learn" && activeTab === "listening" && (
                  <QuizSection
                    questions={questions}
                    answers={answers}
                    onAnswer={handleAnswer}
                    onRetry={handleRetryIncorrect}
                    onScore={(score) => handleSetSessionScore("listening", score)}
                    hasTranscript={Boolean(transcriptSegments.length || transcript)}
                  />
                )}

                {mode === "learn" && activeTab === "writing" && (
                  loadingExtended && keySentences.length === 0 ? (
                    <div className="card">
                      <h2>쓰기 연습</h2>
                      <p className="muted">쓰기 문제를 생성 중입니다. 잠시만 기다려 주세요...</p>
                    </div>
                  ) : (
                    <WritingSection
                      referenceSummary={{ summary, keySentences }}
                      onFeedback={handleWritingFeedback}
                      feedback={writingFeedback}
                      loading={loadingWriting}
                    />
                  )
                )}

                {mode === "learn" && activeTab === "reading" && (
                  loadingExtended && !readingPassage ? (
                    <div className="card">
                      <h2>읽기 모드</h2>
                      <p className="muted">읽기 지문과 문제를 생성 중입니다. 잠시만 기다려 주세요...</p>
                    </div>
                  ) : (
                    <ReadingQuizSection
                      passage={readingPassage}
                      questions={readingQuestions}
                      onScore={(score) => handleSetSessionScore("reading", score)}
                      hasTranscript={Boolean(transcriptSegments.length || transcript)}
                    />
                  )
                )}

                {mode === "learn" && activeTab === "speaking" && (
                  loadingExtended && keySentences.length === 0 ? (
                    <div className="card">
                      <h2>말하기 모드</h2>
                      <p className="muted">쉐도잉 문장을 생성 중입니다. 잠시만 기다려 주세요...</p>
                    </div>
                  ) : (
                    <SpeakingSection
                      keySentences={keySentences}
                      onSpeakingScored={(score) => handleSetSessionScore("speaking", score)}
                      hasTranscript={Boolean(transcriptSegments.length || transcript)}
                    />
                  )
                )}

                {mode === "learn" && activeTab === "vocab" && (
                  <div className="card">
                    <h2>이 에피소드의 어휘</h2>
                    {loadingExtended && vocab.length === 0 ? (
                      <p className="muted">어휘 문제를 생성 중입니다. 잠시만 기다려 주세요...</p>
                    ) : vocab.length > 0 ? (
                      <ul className="vocab-list">
                        {vocab.map((v, idx) => (
                          <li key={idx} className="vocab-item">
                            <strong>{v.word}</strong> - {v.meaning}
                            {v.from_sentence && (
                              <div className="vocab-origin">
                                <span className="vocab-origin__label">본문:</span>{" "}
                                <em className="vocab-origin__text">{v.from_sentence}</em>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">
                        {transcriptSegments.length || transcript
                          ? "어휘 생성중입니다. 잠시만 기다려 주세요."
                          : "에피소드 화면에서 자막 생성(STT)을 먼저 진행해 주세요."}
                      </p>
                    )}
                  </div>
                )}

                {mode === "manage" && activeTab === "stats" && (
                  <StatsSection history={history} coachComment={coachComment} />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

