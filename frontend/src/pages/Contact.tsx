import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { ROUTES } from '@/config/routes.config';
import toast from 'react-hot-toast';
import { api } from '@/api/client';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      await api.post('/contact', data);
      toast.success('Message sent successfully! We will get back to you soon.');
      setIsSubmitted(true);
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="container mx-auto flex justify-between items-center">
          <Link to={ROUTES.LANDING} className="text-2xl font-bold text-emerald-500 hover:text-emerald-400 transition-colors">
            Casino Royal
          </Link>
          <Link to={ROUTES.LOGIN}>
            <Button variant="secondary">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
            <p className="text-gray-300">
              Have questions or need assistance? We're here to help. Fill out the form below and we'll get back to you as soon as possible.
            </p>
          </div>

          {isSubmitted ? (
            <div className="card p-8 text-center">
              <div className="text-green-500 text-6xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-white mb-4">Thank You!</h2>
              <p className="text-gray-300 mb-6">
                Your message has been sent successfully. Our team will review your inquiry and respond within 24-48 hours.
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="secondary" onClick={() => setIsSubmitted(false)}>
                  Send Another Message
                </Button>
                <Link to={ROUTES.LANDING}>
                  <Button variant="primary">Back to Home</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="card p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Input
                  label="Your Name"
                  placeholder="John Doe"
                  error={errors.name?.message}
                  {...register('name')}
                />

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="john@example.com"
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Input
                  label="Subject"
                  placeholder="How can we help you?"
                  error={errors.subject?.message}
                  {...register('subject')}
                />

                <div className="form-group">
                  <label className="label">Message</label>
                  <textarea
                    className={`input min-h-[150px] resize-y ${errors.message ? 'input-error' : ''}`}
                    placeholder="Please describe your inquiry in detail..."
                    {...register('message')}
                  />
                  {errors.message && <p className="error-message">{errors.message.message}</p>}
                </div>

                <Button type="submit" fullWidth loading={isSubmitting}>
                  Send Message
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-dark-600">
                <h3 className="text-lg font-semibold text-white mb-4">Other Ways to Reach Us</h3>
                <div className="space-y-3 text-gray-300">
                  <p>
                    <span className="text-emerald-500 font-medium">Email:</span>{' '}
                    <a href="mailto:support@casinoroyal.com" className="hover:text-emerald-400 transition-colors">
                      support@casinoroyal.com
                    </a>
                  </p>
                  <p>
                    <span className="text-emerald-500 font-medium">Business Hours:</span>{' '}
                    Monday - Friday, 9:00 AM - 6:00 PM (EST)
                  </p>
                  <p>
                    <span className="text-emerald-500 font-medium">Response Time:</span>{' '}
                    We typically respond within 24-48 hours
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Back to home link */}
          <div className="text-center mt-6">
            <Link to={ROUTES.LANDING} className="text-emerald-500 hover:text-emerald-400 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-dark-700">
        <div className="container mx-auto text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} Casino Royal. All Rights Reserved. | United States</p>
        </div>
      </footer>
    </div>
  );
}
