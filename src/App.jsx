import { useState, useMemo, useEffect } from 'react';

// ---------- Heuristic English syllabifier ----------
// Rule-based (vowel groups, common digraphs/blends, silent e) — no dictionary.
// Syllable COUNT is usually reliable; exact break placement can occasionally
// differ from a dictionary for ambiguous words.

const VOWELS = 'aeiou';
const DIGRAPHS = ['ch', 'sh', 'th', 'ph', 'wh', 'ng', 'ck', 'qu', 'gh'];
const BLENDS = ['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'sc', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'tr', 'tw', 'tch'];
const TRIBLENDS = ['str', 'spl', 'spr', 'scr', 'thr'];

function isVowelChar(ch, idx) {
  if (ch === 'y') return idx !== 0;
  return VOWELS.includes(ch);
}

function syllabifyWord(rawWord) {
  const word = rawWord.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return [];

  const groups = [];
  let i = 0;
  while (i < word.length) {
    if (isVowelChar(word[i], i)) {
      const start = i;
      while (i < word.length && isVowelChar(word[i], i)) i++;
      groups.push([start, i]);
    } else {
      i++;
    }
  }
  if (groups.length === 0) return [word];

  // Drop a silent trailing "e" — but keep it when it's a consonant+"le" syllable
  // (table, apple) since that "le" carries its own syllable.
  let effective = groups;
  const last = groups[groups.length - 1];
  if (groups.length > 1 && word.endsWith('e') && last[1] - last[0] === 1 && last[0] === word.length - 1) {
    const before = word[word.length - 2];
    const isConsonantLE = before === 'l' && word.length >= 3 && !isVowelChar(word[word.length - 3], word.length - 3);
    if (!VOWELS.includes(before) && before !== 'y' && !isConsonantLE) {
      effective = groups.slice(0, -1);
    }
  }
  if (effective.length <= 1) return [word];

  const splits = [];
  for (let g = 0; g < effective.length - 1; g++) {
    const curEnd = effective[g][1];
    const nextStart = effective[g + 1][0];
    const cons = word.slice(curEnd, nextStart);

    if (cons.length === 0) {
      splits.push(nextStart);
    } else if (cons.length === 1) {
      splits.push(curEnd);
    } else {
      const last2 = cons.slice(-2);
      const last3 = cons.slice(-3);
      if (cons.length === 2 && cons[0] === cons[1]) {
        splits.push(curEnd + 1);
      } else if (TRIBLENDS.includes(last3)) {
        splits.push(nextStart - 3);
      } else if (DIGRAPHS.includes(last2) || BLENDS.includes(last2)) {
        splits.push(nextStart - 2);
      } else {
        splits.push(curEnd + Math.ceil(cons.length / 2));
      }
    }
  }

  const syllables = [];
  let prev = 0;
  for (const sp of splits) {
    syllables.push(word.slice(prev, sp));
    prev = sp;
  }
  syllables.push(word.slice(prev));
  return syllables;
}

function syllabifyPhrase(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => ({ token: tok, syllables: syllabifyWord(tok) }));
}

const HILITE = ['#FFD166', '#06D6A0', '#4CC9F0', '#F72585', '#9B5DE5'];
const EXAMPLES = ['elephant', 'banana', 'computer', 'wonderful', 'umbrella', 'syllable'];

export default function SyllableBreaker() {
  const [text, setText] = useState('elephant');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
  }, []);

  const words = useMemo(() => syllabifyPhrase(text), [text]);
  const totalSyllables = words.reduce((sum, w) => sum + w.syllables.length, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Poppins:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');

        .sb-root {
          font-family: 'Poppins', sans-serif;
          background: #F6F7FB;
          background-image: repeating-linear-gradient(to bottom, transparent 0px, transparent 38px, #E7EAF4 39px);
          min-height: 100%;
          padding: 40px 24px 56px;
          box-sizing: border-box;
        }
        .sb-card { max-width: 560px; margin: 0 auto; }
        .sb-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;
          color: #8B91A7; margin-bottom: 6px;
        }
        .sb-title { font-family: 'Baloo 2', sans-serif; font-weight: 800; font-size: 30px; color: #1F2430; margin: 0 0 4px; }
        .sb-sub { color: #6B7280; font-size: 14px; margin: 0 0 28px; }
        .sb-input {
          width: 100%; font-family: 'Baloo 2', sans-serif; font-size: 26px; font-weight: 600;
          color: #1F2430; border: none; border-bottom: 3px solid #C7CCE0; background: transparent;
          padding: 8px 4px 12px; outline: none; box-sizing: border-box; transition: border-color 0.2s ease;
        }
        .sb-input:focus { border-bottom-color: #4CC9F0; }
        .sb-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
        .sb-chip {
          font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 500; color: #3A3F52;
          background: #FFFFFF; border: 1px solid #E2E5F0; border-radius: 999px; padding: 6px 14px 6px 10px;
          display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
          transition: transform 0.12s ease, border-color 0.12s ease;
        }
        .sb-chip:hover { border-color: #C7CCE0; transform: translateY(-1px); }
        .sb-chip:focus-visible, .sb-input:focus-visible { outline: 2px solid #4CC9F0; outline-offset: 2px; }
        .sb-chip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .sb-output { margin-top: 40px; min-height: 110px; }
        .sb-word-line { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px; margin-bottom: 14px; }
        .sb-syl { position: relative; font-family: 'Baloo 2', sans-serif; font-weight: 700; font-size: 38px; color: #1F2430; padding: 2px 3px; }
        .sb-slash { font-family: 'JetBrains Mono', monospace; font-size: 26px; color: #B7BCD1; margin: 0 3px; align-self: center; }
        @keyframes sb-swipe { to { transform: scaleX(1); } }
        .sb-count { font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: 0.06em; color: #8B91A7; text-transform: uppercase; }
        .sb-footer { margin-top: 36px; font-size: 12.5px; color: #9AA0B4; line-height: 1.6; border-top: 1px solid #E2E5F0; padding-top: 16px; }
      `}</style>
      <div className="sb-root">
        <div className="sb-card">
          <div className="sb-eyebrow">English · Phonics Tool</div>
          <h1 className="sb-title">Syllable Breaker</h1>
          <p className="sb-sub">Type a word and watch it split into syllables, marker-style.</p>

          <input
            className="sb-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="type a word…"
            autoFocus
            spellCheck={false}
          />

          <div className="sb-chips">
            {EXAMPLES.map((ex, idx) => (
              <button key={ex} type="button" className="sb-chip" onClick={() => setText(ex)}>
                <span className="sb-chip-dot" style={{ background: HILITE[idx % HILITE.length] }} />
                {ex}
              </button>
            ))}
          </div>

          <div className="sb-output" key={text}>
            {words.length > 0 ? (
              <>
                {words.map((w, wi) => (
                  <div className="sb-word-line" key={wi}>
                    {w.syllables.map((syl, si) => (
                      <span key={si} style={{ display: 'flex', alignItems: 'baseline' }}>
                        <span className="sb-syl">
                          <span
                            style={{
                              position: 'absolute',
                              left: -2, right: -2, bottom: 4, height: 14,
                              borderRadius: 3, zIndex: -1,
                              background: HILITE[si % HILITE.length],
                              opacity: 0.55,
                              transform: reducedMotion ? 'scaleX(1)' : 'scaleX(0)',
                              transformOrigin: 'left',
                              animation: reducedMotion ? 'none' : 'sb-swipe 0.32s ease-out forwards',
                              animationDelay: reducedMotion ? '0ms' : `${si * 90}ms`,
                            }}
                          />
                          {syl}
                        </span>
                        {si < w.syllables.length - 1 && <span className="sb-slash">/</span>}
                      </span>
                    ))}
                  </div>
                ))}
                <div className="sb-count">
                  {totalSyllables} syllable{totalSyllables !== 1 ? 's' : ''}
                  {words.length > 1 ? ` across ${words.length} words` : ''}
                </div>
              </>
            ) : (
              <div style={{ color: '#B7BCD1', fontSize: 14 }}>Start typing to see the breakdown.</div>
            )}
          </div>

          <div className="sb-footer">
            Rule-based, not dictionary-based — it follows common English spelling patterns (vowel groups, blends, silent e),
            so syllable <em>count</em> is usually reliable, but the exact break point can occasionally differ from a
            dictionary on ambiguous words.
          </div>
        </div>
      </div>
    </>
  );
}
