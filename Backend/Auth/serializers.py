from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser
import re

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password')

    def validate_password(self, value):
        if len(value) > 48:
            raise serializers.ValidationError("Password is too long.")
        if len(value) < 8:
            raise serializers.ValidationError("Password is too short.")
        if not re.match(r'^[\x20-\x7E]+$', value):
            raise serializers.ValidationError("Invalid characters.")
        return value

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        return {
            "token": data["access"]
        }
    
    
from rest_framework import serializers
from .models import CustomUser

class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    old_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        # Дозволяємо редагувати username, email та password.
        fields = ['username', 'email', 'password', 'old_password', 'streak_days', 'last_submission_date']
        read_only_fields = ['streak_days', 'last_submission_date']

    def validate_email(self, value):
        # Додаткова параноя: перевіряємо, чи мило не зайняте кимось іншим
        user = self.context['request'].user
        if CustomUser.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("Цей email вже використовується.")
        return value

    def validate(self, data):
        password = data.get('password')
        old_password = data.get('old_password')

        if password:
            if not old_password:
                raise serializers.ValidationError({"old_password": "Для встановлення нового пароля потрібно ввести старий."})
            
            user = self.context['request'].user
            if not user.check_password(old_password):
                raise serializers.ValidationError({"old_password": "Невірний старий пароль."})
        
        return data

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('old_password', None)  # Не передаємо в save()
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance