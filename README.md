<p align="center"><img src="src-tauri/icons/icon.svg" width="112" alt="Studigo icon"></p>

<h1 align="center">Studigo</h1>

<p align="center"><b>A local-first AI study companion for your own course materials.</b><br>Import your PDFs, slides, images, videos and links; the tutor explains every section, formula and diagram step by step, gives exercises, and checks that you have really understood before moving on. No account, no subscription, your documents stay on your machine.</p>

<p align="center"><b>Early prototype.</b> The shell, design system, AI providers, voice and local database come from Sprigo; the study domain is being built here.</p>

## The idea

NotebookLM-style tools answer questions. Studigo is built for **coverage**:

- **Bring your own material.** A PDF, a Word file, phone photos of the board, a YouTube video, a web page.
- **Nothing is skipped.** Every page, section, formula and diagram becomes a point on a coverage map. The app shows what is left and refuses to call a section finished until you prove it.
- **Step by step.** Calculations are checked with a computer-algebra system, diagrams are read with a vision model, and the tutor writes the reasoning on the board.
- **Mastery gates.** You explain in your own words, redo the step, and solve an exercise before moving on. That prepares you for a written exam, not only for a multiple-choice quiz.
- **The study room.** Four panes, same design language as Sprigo: the tutor, you (camera or avatar), the course document, and the whiteboard. Voice, captions and annotations come next.

## Current state

This repository is the first scaffold:

- The full Studigo shell and design system (navigation, profiles, settings, garden, league, phone companion, themes, six UI languages).
- A study home with a source library (local metadata for PDF, Word, images, videos, YouTube and web links).
- A four-pane **Study room**: tutor, learner, course document and whiteboard, responsive on phones.
- Placeholder **Exercises** and **Sheets** screens, ready for the study exercises and formula cards.
- The language-course picker and language lessons have been removed from the visible navigation. Some inherited language modules are still in the tree and will be deleted as the study domain replaces them.

Next: source ingestion (PDF text/OCR, Word, web, video transcripts), a concept/coverage model, vision for diagrams, a CAS for maths, and the tutor prompts.

## Run it

Prerequisites: Node.js with pnpm, Rust, and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for the desktop app.

```bash
pnpm install
pnpm dev            # browser preview at http://localhost:1420
pnpm tauri dev      # desktop app
pnpm test
pnpm build
```

The bundled Whisper model is fetched with `pnpm fetch-model` (also run by `tauri build`).

## AI

The inherited provider layer supports Ollama, LM Studio, DeepSeek, OpenAI, Anthropic, Gemini and OpenRouter. The study app will also need a **vision provider** for diagrams and a **CAS** (for example SymPy) for step-checked calculations; both are on the roadmap.

## Credits

Studigo reuses the Sprigo shell and infrastructure (MIT). The original Sprigo author is credited in [LICENSE](LICENSE); the Studigo modifications are by Toukea Pessong Nestor Corneille.

## License

[MIT](LICENSE)
