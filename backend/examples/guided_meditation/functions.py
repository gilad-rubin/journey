#!/usr/bin/env python3
"""
Guided Meditation Functions for Journey Workflows

This module provides custom functions for guided meditation workflows,
including breathing patterns, mindfulness techniques, and personalization.
"""

import random
from typing import Dict, List

from journey.tool_registry import ToolRegistry


def calculate_breathing_pattern(pattern_type: str) -> Dict[str, int]:
    """
    Calculate breathing pattern timings based on type.
    
    Args:
        pattern_type: Type of breathing pattern ('4-7-8', 'box', 'triangle', 'simple')
        
    Returns:
        Dict with 'inhale', 'hold', 'exhale' times in seconds
    """
    patterns = {
        '4-7-8': {'inhale': 4, 'hold': 7, 'exhale': 8},
        'box': {'inhale': 4, 'hold': 4, 'exhale': 4},
        'triangle': {'inhale': 4, 'hold': 0, 'exhale': 4},
        'simple': {'inhale': 3, 'hold': 0, 'exhale': 3}
    }
    
    return patterns.get(pattern_type, patterns['simple'])


def suggest_meditation_duration(experience_level: str, available_time: int) -> int:
    """
    Suggest optimal meditation duration based on experience and available time.
    
    Args:
        experience_level: 'beginner', 'intermediate', 'advanced'
        available_time: Available time in minutes
        
    Returns:
        Suggested duration in minutes
    """
    # Coerce available_time to int if passed as string
    try:
        available_time = int(str(available_time).strip())
    except Exception:
        available_time = 10

    suggestions = {
        'beginner': min(available_time, 10),
        'intermediate': min(available_time, 20),
        'advanced': min(available_time, 30)
    }
    
    base_duration = suggestions.get(experience_level, 5)
    
    # Don't suggest less than 3 minutes or more than available time
    return max(3, min(base_duration, available_time))


def generate_mindfulness_prompt(focus_area: str) -> str:
    """
    Generate a mindfulness prompt based on focus area.
    
    Args:
        focus_area: 'breath', 'body', 'thoughts', 'emotions', 'gratitude'
        
    Returns:
        A mindfulness prompt string
    """
    prompts = {
        'breath': [
            "Notice the natural rhythm of your breath. Feel the air flowing in and out.",
            "Observe your breath without trying to change it. Simply be aware.",
            "Feel the sensation of breathing in your nostrils and chest."
        ],
        'body': [
            "Scan your body from head to toe, noticing any sensations.",
            "Feel the weight of your body and how it's supported.",
            "Notice areas of tension or relaxation in your body."
        ],
        'thoughts': [
            "Observe your thoughts like clouds passing in the sky.",
            "Notice thoughts arising and passing away without judgment.",
            "When you notice thinking, gently return attention to the present."
        ],
        'emotions': [
            "Notice any emotions present without trying to change them.",
            "Breathe with whatever feelings are here right now.",
            "Allow emotions to be as they are, with kindness."
        ],
        'gratitude': [
            "Bring to mind something you're grateful for today.",
            "Feel the warmth of appreciation in your heart.",
            "Notice three things you appreciate about this moment."
        ]
    }
    
    area_prompts = prompts.get(focus_area, prompts['breath'])
    return random.choice(area_prompts)


def assess_stress_level(responses: List[str]) -> str:
    """
    Assess stress level based on user responses.
    
    Args:
        responses: List of user responses about their current state
        
    Returns:
        Stress level: 'low', 'moderate', 'high'
    """
    stress_indicators = {
        'high': ['anxious', 'overwhelmed', 'stressed', 'panicked', 'racing', 'tense', 'worried'],
        'moderate': ['busy', 'tired', 'restless', 'distracted', 'uncomfortable'],
        'low': ['calm', 'peaceful', 'relaxed', 'content', 'balanced', 'centered']
    }
    
    response_text = ' '.join(responses).lower()
    
    high_count = sum(1 for word in stress_indicators['high'] if word in response_text)
    moderate_count = sum(1 for word in stress_indicators['moderate'] if word in response_text)
    
    if high_count > 0:
        return 'high'
    elif moderate_count > 0:
        return 'moderate'
    else:
        return 'low'


def create_personalized_affirmation(intention: str, name: str = "") -> str:
    """
    Create a personalized affirmation based on intention.
    Always returns a friendly string, even on unexpected input.
    """
    try:
        intention_str = (intention or "").strip()
        name_str = (name or "").strip()

        affirmation_templates = {
            'peace': "May {name}find deep peace and tranquility.",
            'strength': "May {name}discover your inner strength and resilience.",
            'clarity': "May {name}gain clarity and insight.",
            'healing': "May {name}experience healing and renewal.",
            'gratitude': "May {name}feel grateful for all the goodness in your life.",
            'love': "May {name}feel love and compassion for yourself and others.",
            'focus': "May {name}develop clear focus and concentration."
        }

        # Map common synonyms/phrases to template keys (covers 'heart' → love)
        synonyms = {
            'peace': ['peace', 'calm', 'relax', 'relaxed', 'tranquil', 'ease'],
            'strength': ['strength', 'resilience', 'power', 'courage'],
            'clarity': ['clarity', 'clear', 'insight', 'understand', 'focus'],
            'healing': ['healing', 'heal', 'recover', 'renewal'],
            'gratitude': ['gratitude', 'grateful', 'appreciation', 'appreciate'],
            'love': ['love', 'heart', 'compassion', 'kindness', 'connection'],
            'focus': ['focus', 'concentration', 'concentrate', 'attention']
        }

        intention_lower = intention_str.lower()
        chosen_key = None
        for key, words in synonyms.items():
            if any(word in intention_lower for word in words):
                chosen_key = key
                break

        name_part = f"{name_str}, " if name_str else ""

        if chosen_key:
            return affirmation_templates[chosen_key].format(name=name_part)

        # Default affirmation
        return f"May {name_part}find what you're seeking in this practice."
    except Exception as e:
        # Never fail silently; return a safe default
        from loguru import logger
        logger.debug(f"create_personalized_affirmation error: {e}")
        name_str = (name or "").strip()
        name_part = f"{name_str}, " if name_str else ""
        return f"May {name_part}find what you're seeking in this practice."


def check_time_availability(available_time: str) -> str:
    """
    Categorize available time into short, medium, or long sessions.
    
    Args:
        available_time: Time in minutes as string
        
    Returns:
        Category: 'short' (5-10 min), 'medium' (10-20 min), 'long' (20+ min)
    """
    try:
        time_int = int(str(available_time).strip())
        if time_int <= 10:
            return 'short'
        elif time_int <= 20:
            return 'medium'
        else:
            return 'long'
    except Exception:
        return 'short'


def determine_meditation_path(stress_level: str, available_time: str) -> str:
    """
    Determine the meditation path based on stress level and time.
    
    Args:
        stress_level: 'low', 'moderate', 'high'
        available_time: Time in minutes as string
        
    Returns:
        Path: 'quick_calm', 'gentle_journey', 'deep_restoration', 'peaceful_exploration'
    """
    time_category = check_time_availability(available_time)
    
    if stress_level == 'high':
        if time_category == 'short':
            return 'quick_calm'
        else:
            return 'deep_restoration'
    elif stress_level == 'moderate':
        if time_category in ['short', 'medium']:
            return 'gentle_journey'
        else:
            return 'peaceful_exploration'
    else:  # low stress
        if time_category == 'short':
            return 'gentle_journey'
        else:
            return 'peaceful_exploration'


def get_story_introduction(meditation_path: str) -> str:
    """
    Get a story-like introduction based on the meditation path.
    
    Args:
        meditation_path: The determined meditation path
        
    Returns:
        A story introduction string
    """
    introductions = {
        'quick_calm': "Imagine you're stepping into a quiet garden sanctuary where stress melts away with each breath...",
        'gentle_journey': "Picture yourself on a peaceful mountain path, where each step brings more clarity and calm...",
        'deep_restoration': "Envision yourself in a healing forest grove, where ancient trees share their wisdom and tranquility...",
        'peaceful_exploration': "See yourself floating on a serene lake at sunset, with infinite peace surrounding you..."
    }
    
    return introductions.get(meditation_path, introductions['gentle_journey'])


def get_final_wisdom(meditation_path: str) -> str:
    """
    Get closing wisdom based on the meditation path taken.
    
    Args:
        meditation_path: The meditation path that was followed
        
    Returns:
        Closing wisdom string
    """
    wisdom = {
        'quick_calm': "Like a flower that blooms in moments, you've found peace in this brief sanctuary. Carry this calm with you.",
        'gentle_journey': "Your inner mountain remains steady and strong. You can return to this peaceful path whenever you need.",
        'deep_restoration': "The healing energy of the forest flows within you now. Trust in your body's natural wisdom to restore itself.",
        'peaceful_exploration': "The vast peace of the lake lives within your heart. You are both the stillness and the infinite sky above."
    }
    
    return wisdom.get(meditation_path, wisdom['gentle_journey'])


def register_meditation_tools(registry: ToolRegistry) -> None:
    """Register all meditation-related tools with the registry."""
    
    registry.register(
        "calculate_breathing_pattern",
        calculate_breathing_pattern,
        description="Calculate breathing pattern timings for guided meditation",
        category="meditation",
        examples=["calculate_breathing_pattern('4-7-8')", "calculate_breathing_pattern('box')"]
    )
    
    registry.register(
        "suggest_meditation_duration",
        suggest_meditation_duration,
        description="Suggest optimal meditation duration based on experience and time",
        category="meditation",
        examples=["suggest_meditation_duration('beginner', 15)", "suggest_meditation_duration('advanced', 30)"]
    )
    
    registry.register(
        "generate_mindfulness_prompt",
        generate_mindfulness_prompt,
        description="Generate a mindfulness prompt for focused attention",
        category="meditation",
        examples=["generate_mindfulness_prompt('breath')", "generate_mindfulness_prompt('gratitude')"]
    )
    
    registry.register(
        "assess_stress_level",
        assess_stress_level,
        description="Assess user's stress level from their responses",
        category="meditation",
        examples=["assess_stress_level(['feeling anxious', 'overwhelmed'])", "assess_stress_level(['peaceful', 'calm'])"]
    )
    
    registry.register(
        "create_personalized_affirmation",
        create_personalized_affirmation,
        description="Create a personalized affirmation based on intention",
        category="meditation",
        examples=["create_personalized_affirmation('peace', 'Sarah')", "create_personalized_affirmation('strength')"]
    )
    
    registry.register(
        "check_time_availability",
        check_time_availability,
        description="Categorize available time into short, medium, or long sessions",
        category="meditation",
        examples=["check_time_availability('15')", "check_time_availability('5')"]
    )
    
    registry.register(
        "determine_meditation_path",
        determine_meditation_path,
        description="Determine the meditation path based on stress level and available time",
        category="meditation",
        examples=["determine_meditation_path('high', '10')", "determine_meditation_path('low', '25')"]
    )
    
    registry.register(
        "get_story_introduction",
        get_story_introduction,
        description="Get a story-like introduction based on the meditation path",
        category="meditation",
        examples=["get_story_introduction('quick_calm')", "get_story_introduction('peaceful_exploration')"]
    )
    
    registry.register(
        "get_final_wisdom",
        get_final_wisdom,
        description="Get closing wisdom based on the meditation path taken",
        category="meditation",
        examples=["get_final_wisdom('deep_restoration')", "get_final_wisdom('gentle_journey')"]
    )