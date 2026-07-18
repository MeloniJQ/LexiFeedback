import unittest

from agents.interview_planner import build_interview_plan


class InterviewPlanningTests(unittest.TestCase):
    def test_build_interview_plan_with_resume_and_jd(self):
        resume_data = {
            "candidate_name": "Jane Doe",
            "skills": ["Python", "Flask", "Docker"],
            "frameworks": ["Flask"],
            "tools": ["Docker", "Git"],
        }
        jd_data = {
            "required_skills": ["Python", "Flask", "PostgreSQL", "Docker"],
            "required_technologies": ["Python", "Flask", "PostgreSQL", "Docker"],
            "preferred_domain": ["SaaS"],
        }
        match_data = {
            "matching_skills": ["Python", "Flask", "Docker"],
            "missing_skills": ["PostgreSQL"],
        }

        plan = build_interview_plan(
            candidate_name=resume_data["candidate_name"],
            resume_data=resume_data,
            jd_data=jd_data,
            match_data=match_data,
        )

        self.assertIn("title", plan)
        self.assertTrue(plan["strengths"])
        self.assertIn("PostgreSQL", plan["gaps"])
        self.assertGreaterEqual(len(plan["interview_blueprint"]), 3)
        self.assertIn("SaaS", plan["question_themes"])


if __name__ == "__main__":
    unittest.main()
