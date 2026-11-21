import unittest

from services.resume_parser import extract_resume_data
from services.jd_parser import extract_job_description_data
from services.match_service import generate_profile_match


class CandidateIntelligenceTests(unittest.TestCase):
    def test_resume_parser_extracts_sections(self):
        text = """
        Jane Doe
        jane.doe@example.com | +1 555-123-4567

        Education
        B.S. Computer Science, 2022

        Skills
        Python, SQL, Docker, React, AWS

        Projects
        Built a Flask API for analytics.
        """

        parsed = extract_resume_data(text)
        self.assertEqual(parsed["candidate_name"], "Jane Doe")
        self.assertIn("Python", parsed["skills"])
        self.assertIn("SQL", parsed["skills"])
        self.assertIn("AWS", parsed["tools"])
        self.assertEqual(parsed["education"][0]["degree"], "B.S. Computer Science")

    def test_jd_parser_extracts_requirements(self):
        jd = """
        We are hiring a Python Backend Engineer.
        Required skills: Python, Flask, PostgreSQL, Docker.
        Responsibilities include building APIs and data pipelines.
        Preferred experience: 3+ years in SaaS products.
        """

        parsed = extract_job_description_data(jd)
        self.assertIn("Python", parsed["required_skills"])
        self.assertIn("Flask", parsed["frameworks"])
        self.assertIn("PostgreSQL", parsed["database_technologies"])
        self.assertIn("SaaS", parsed["preferred_domain"])

    def test_match_service_returns_percentages(self):
        resume_data = {
            "candidate_name": "Jane Doe",
            "skills": ["Python", "Flask", "SQL", "Docker"],
            "programming_languages": ["Python"],
            "frameworks": ["Flask"],
            "databases": ["PostgreSQL"],
            "tools": ["Docker"],
        }
        jd_data = {
            "required_skills": ["Python", "Flask", "PostgreSQL", "Docker"],
            "programming_languages": ["Python"],
            "frameworks": ["Flask"],
            "database_technologies": ["PostgreSQL"],
            "required_tools": ["Docker"],
        }

        match = generate_profile_match(resume_data, jd_data)
        self.assertGreaterEqual(match["skill_match_percentage"], 75)
        self.assertIn("Python", match["matching_skills"])
        self.assertIn("PostgreSQL", match["matching_skills"])


if __name__ == "__main__":
    unittest.main()
