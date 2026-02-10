from django.urls import path
from .views import RegisterView, LoginView, UserProfileUpdateView, health_check

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('profile/', UserProfileUpdateView.as_view(), name='profile-update'),
    path('health/', health_check, name='health_check'),
]
