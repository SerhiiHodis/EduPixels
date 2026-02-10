# 🌐 EduPixels: Frontend Architecture

This repository contains the Frontend source code for the **EduPixels** AI learning platform. The user interface is designed with a modern "Pixel-Art" aesthetic, delivering a high-end, responsive experience for learners.

## 🛠 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: React Router DOM v7
- **Icons**: Phosphor Icons (React)
- **Content Parsing**: Marked + DOMPurify
- **Syntax Highlighting**: Highlight.js

## 🧠 Technical Case Studies

### 1. Selection-Aware AI Interaction
Implemented a custom tooltip system that detects user text selection within lesson content.
- **Goal**: Allow users to ask the AI about specific concepts without leaving the flow.
- **Challenge**: Coordinating DOM ranges with React's state to position the tooltip accurately over the selection.
- **Solution**: A custom `mouseup` listener that calculates bounding rectangles of the selection range and triggers a floating UI component with "Ask AI" functionality.

### 2. Persistent Highlight & Content Memoization
Ensuring that complex lesson content with code snippets remains interactive and visually consistent.
- **Goal**: Prevent flickering or loss of syntax highlighting during parent state updates (e.g., progress syncing).
- **Challenge**: `dangerousSetInnerHTML` often causes full DOM node replacement, losing manual DOM modifications made by Highlight.js.
- **Solution**: Usage of `React.memo` and careful `useEffect` management to apply highlighting and copy-to-clipboard buttons only when the source Markdown actually changes.

### 3. Real-Time Progress Tracking
A seamless way to monitor and persist student learning metrics.
- **Goal**: Link lesson consumption with user progress without manual "Complete" buttons.
- **Solution**: Scroll-tracking logic that calculates the percentage of the lesson read and syncs it with local storage/backend API asynchronously, ensuring a "frictionless" learning experience.

## 🎨 UI/UX Philosophy
The design follows a unique **"Glass-Pixel"** style—combining modern semi-transparent blurs with crisp, retro-inspired pixel fonts and borders. This contrast creates a premium feel that stood out in competition.

---
*Developed by Serhiy Hodis for the Sigma Software Winning Project.*
