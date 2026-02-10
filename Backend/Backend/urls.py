# project/urls.py
from django.contrib import admin
from django.urls import path, include
from Auth.views import ProfileView, UserProfileUpdateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include('Auth.urls')),
    path('profile/', UserProfileUpdateView.as_view(), name='profile'),
    path('courses/', include('Courses.urls')),
    path("teacher/", include("Teacher.urls"))
]
