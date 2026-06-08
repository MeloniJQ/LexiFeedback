'use client'

import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { MessageSquare, Target, Users, Award, Heart, Zap } from 'lucide-react'

export default function AboutPage() {
  const features = [
    {
      icon: <MessageSquare className="w-8 h-8 text-blue-600" />,
      title: 'AI-Powered Feedback',
      description: 'Get instant, personalized feedback on your English speaking skills using advanced AI technology.'
    },
    {
      icon: <Target className="w-8 h-8 text-green-600" />,
      title: 'Multiple Practice Modes',
      description: 'Choose from interview practice, presentations, conversations, and reading exercises tailored to your needs.'
    },
    {
      icon: <Users className="w-8 h-8 text-purple-600" />,
      title: 'Real-World Scenarios',
      description: 'Practice with realistic situations you\'ll encounter in professional and personal settings.'
    },
    {
      icon: <Award className="w-8 h-8 text-orange-600" />,
      title: 'Progress Tracking',
      description: 'Monitor your improvement with detailed analytics and set achievable learning goals.'
    }
  ]

  const team = [
    {
      name: 'Sarah Johnson',
      role: 'AI Research Lead',
      bio: 'PhD in Natural Language Processing with 8+ years experience in speech recognition and language learning technologies.'
    },
    {
      name: 'Michael Chen',
      role: 'Product Manager',
      bio: 'Former ESL teacher with a passion for leveraging technology to make language learning accessible to everyone.'
    },
    {
      name: 'Dr. Emily Rodriguez',
      role: 'Linguistics Expert',
      bio: 'Professor of Applied Linguistics specializing in second language acquisition and pronunciation training.'
    }
  ]

  const stats = [
    { number: '50K+', label: 'Active Learners' },
    { number: '1M+', label: 'Practice Sessions' },
    { number: '95%', label: 'Satisfaction Rate' },
    { number: '40+', label: 'Countries Served' }
  ]

  return (
    <div className="flex h-screen bg-white dark:bg-[#0F172A]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-12">
            {/* Hero Section */}
            <div className="text-center py-12">
              <h1 className="text-4xl font-bold text-[#1F2937] dark:text-white mb-4">
                About Lexical
              </h1>
              <p className="text-xl text-[#6B7280] dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
                We're on a mission to democratize English language learning through cutting-edge AI technology.
                Our platform provides personalized, real-time feedback to help you master spoken English with confidence.
              </p>
            </div>

            {/* Mission Statement */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8 border border-blue-200 dark:border-blue-800">
              <div className="text-center">
                <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white mb-4">
                  Our Mission
                </h2>
                <p className="text-lg text-[#6B7280] dark:text-gray-400 max-w-4xl mx-auto leading-relaxed">
                  We believe that effective communication is the key to success in today's global world.
                  Lexical was born from the realization that traditional language learning methods often fall short
                  in developing real-world speaking skills. Our AI-powered platform bridges this gap by providing
                  immediate, actionable feedback that helps learners speak English naturally and confidently.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-[#2C5AA0] dark:text-white mb-2">
                    {stat.number}
                  </div>
                  <div className="text-[#6B7280] dark:text-gray-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Features */}
            <div>
              <h2 className="text-3xl font-bold text-[#1F2937] dark:text-white text-center mb-8">
                What Makes Us Different
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {features.map((feature, index) => (
                  <div key={index} className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-[#6B7280] dark:text-gray-400 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Technology */}
            <div className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-8">
              <div className="text-center mb-8">
                <Zap className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white mb-4">
                  Powered by Advanced AI
                </h2>
                <p className="text-[#6B7280] dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
                  Our proprietary AI models are trained on millions of hours of natural speech data,
                  enabling us to provide highly accurate feedback on pronunciation, fluency, grammar,
                  and communication effectiveness. We continuously update our models to ensure
                  the most relevant and helpful guidance for our users.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-[#2C5AA0] dark:text-white mb-2">
                    99.5%
                  </div>
                  <div className="text-[#6B7280] dark:text-gray-400">
                    Accuracy Rate
                  </div>
                </div>
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-[#10B981] dark:text-[#68D391] mb-2">
                    &lt;200ms
                  </div>
                  <div className="text-[#6B7280] dark:text-gray-400">
                    Response Time
                  </div>
                </div>
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-[#F59E0B] dark:text-[#FCD34D] mb-2">
                    24/7
                  </div>
                  <div className="text-[#6B7280] dark:text-gray-400">
                    Availability
                  </div>
                </div>
              </div>
            </div>

            {/* Team */}
            <div>
              <h2 className="text-3xl font-bold text-[#1F2937] dark:text-white text-center mb-8">
                Meet Our Team
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {team.map((member, index) => (
                  <div key={index} className="bg-white dark:bg-[#1F2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-[#1F2937] dark:text-white mb-2">
                      {member.name}
                    </h3>
                    <p className="text-[#2C5AA0] dark:text-white font-medium mb-3">
                      {member.role}
                    </p>
                    <p className="text-[#6B7280] dark:text-gray-400 text-sm leading-relaxed">
                      {member.bio}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="bg-gray-50 dark:bg-[#1F2937] rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white mb-4">
                Get in Touch
              </h2>
              <p className="text-[#6B7280] dark:text-gray-400 mb-6 max-w-2xl mx-auto">
                Have questions, feedback, or suggestions? We'd love to hear from you.
                Your input helps us improve and better serve the language learning community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-[#2C5AA0] hover:bg-[#1E3A5F] text-white">
                  Contact Support
                </Button>
                <Button variant="outline">
                  Join Our Community
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}