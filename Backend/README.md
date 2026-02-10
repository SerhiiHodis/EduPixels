# ⚙️ EduPixels: Backend & AI Engine

The backend of **EduPixels** is a robust API-driven system that handles course generation, user management, and AI-driven assessment.

## 🛠 Tech Stack

- **Framework**: [Django 5.2](https://www.djangoproject.com/)
- **API**: [Django REST Framework (DRF)](https://www.django-rest-framework.org/)
- **AI Integration**: Google Generative AI (Gemini 1.5 Flash/Pro)
- **Authentication**: JWT via `djangorestframework-simplejwt`
- **Environment**: Python 3.10+ / Dotenv

## 🚀 Key Architectures

### 1. Course Generation Pipeline
The system uses sophisticated prompt engineering to transform a single user input into a multi-level JSON structure:
- **Level 1**: Course metadata and topic validation.
- **Level 2**: Module breakdown with logical progression.
- **Level 3**: Lesson content generation with Markdown formatting and code examples.

### 2. Intelligent Homework Review
Backend logic doesn't just store homework; it acts as a mentor:
- Submissions are sent to the AI with the context of the specific lesson.
- AI returns a detailed feedback string and a numerical grade (0-100).
- Only grades above a certain threshold unlock the next learning module.

### 3. Contextual AI Assistant API
A specialized endpoint that accepts the current lesson's ID and a user's question (plus optional selected text). The backend retrieves the lesson content as context, ensuring the AI response is accurate and relevant to what the student is currently reading.

## 📦 Data Model
- `CourseModel`: Root entity owned by a user.
- `ModuleModel`: Groups related lessons and homework.
- `LessonModel`: Stores the rich-text educational content.
- `HomeworkModel`: Manages assignments and AI feedback loops.

---
*Developed by Danylo Lytvyn for the Sigma Software Winning Project.*
