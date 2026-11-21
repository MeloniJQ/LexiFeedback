import unittest

from agents.recommendation_agent import generate_recommendations
from services.report_service import build_interview_report


class ProductionFeaturesTests(unittest.TestCase):
    def test_build_interview_report_contains_expected_sections(self):
        payload = {
            "overall_score": 85,
            "technical_score": 80,
            "communication_score": 78,
            "grammar_score": 88,
            "vocabulary_score": 84,
            "confidence_score": 82,
            "topic_performance": [
                {"topic": "Python", "score": 88},
                {"topic": "System Design", "score": 74},
            ],
            "project_performance": [
                {"project": "Recommendation Engine", "score": 90},
            ],
            "strengths": ["Clear communication", "Structured answers"],
            "weaknesses": ["System design depth"],
            "frequently_missed_topics": ["Concurrency"],
            "behavioral_performance": [{"topic": "Leadership", "score": 81}],
            "technical_performance": [{"topic": "Algorithms", "score": 77}],
            "time_analysis": {"average_answer_seconds": 75},
            "answer_quality": {"clarity": 84},
            "improvement_suggestions": ["Practice trade-off discussions"],
            "personalized_learning_plan": ["Review distributed systems"],
            "company": "Google",
            "role": "Software Engineer",
        }

        report = build_interview_report(payload)
        self.assertEqual(report["overall_score"], 85)
        self.assertIn("summary", report)
        self.assertIn("learning_plan", report)
        self.assertIn("export_formats", report)

    def test_generate_recommendations_uses_context(self):
        recommendations = generate_recommendations(
            resume_skills=["Python", "Flask"],
            job_requirements=["Python", "System Design", "Docker"],
            weak_skills=["System Design"],
            strong_skills=["Python"],
            missing_concepts=["Concurrency"],
            interview_performance={"technical_score": 72, "communication_score": 84},
        )

        self.assertTrue(recommendations)
        self.assertTrue(any(item["category"] == "practice" for item in recommendations))
        self.assertTrue(any(item["category"] == "resource" for item in recommendations))


if __name__ == "__main__":
    unittest.main()
