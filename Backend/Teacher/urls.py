from django.urls import path
from .views import CheckHomeworkAPIView, AskQuestionAPIView

urlpatterns = [
    path("homeworks/<int:module_id>/check/", CheckHomeworkAPIView.as_view()),
    path("ask_question/", AskQuestionAPIView.as_view()),
]
