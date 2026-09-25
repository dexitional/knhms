import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { asset } from '#/lib/asset'
import { api, ApiError } from '#/lib/api-client'
import { Button } from '#/components/ui/button.tsx'
import { Card, CardContent } from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import { DecorativeBackground } from '#/components/decorative-background'

export const Route = createFileRoute('/student/forgot-pin')({
  component: ForgotPinPage,
})

// Same underline-input treatment as the redesigned login page, kept
// consistent across the two related auth screens.
const underlineInputClass =
  'rounded-none border-0 border-b border-input bg-transparent px-0 shadow-none focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0'

const requestSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required'),
})
type RequestFormValues = z.infer<typeof requestSchema>

const resetSchema = z
  .object({
    otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
    newPin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
    confirmNewPin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  })
  .refine((data) => data.newPin === data.confirmNewPin, {
    message: 'PINs do not match',
    path: ['confirmNewPin'],
  })
type ResetFormValues = z.infer<typeof resetSchema>

function ForgotPinPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')

  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
  })

  const requestMutation = useMutation({
    mutationFn: (values: RequestFormValues) =>
      api.post<{ maskedPhone: string }>('/student-auth/forgot-pin', values),
    onSuccess: (data, values) => {
      setRegistrationNumber(values.registrationNumber)
      setMaskedPhone(data.maskedPhone)
      setStep('reset')
    },
    onError: (err) => {
      requestForm.setError('root', {
        message:
          err instanceof ApiError
            ? err.message
            : 'Something went wrong. Please try again.',
      })
    },
  })

  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  })

  const resetMutation = useMutation({
    mutationFn: (values: ResetFormValues) =>
      api.post('/student-auth/reset-pin', { registrationNumber, ...values }),
    onSuccess: () => navigate({ to: '/student/login' }),
    onError: (err) => {
      resetForm.setError('root', {
        message:
          err instanceof ApiError
            ? err.message
            : 'Something went wrong. Please try again.',
      })
    },
  })

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <DecorativeBackground />
      <Card className="w-full max-w-sm rounded-2xl border-0 bg-white shadow-2xl">
        <CardContent className="flex flex-col p-8 sm:p-10">
          <img
            src={asset('logo.png')}
            alt="Kwame Nkrumah Hall crest"
            className="h-9 w-auto"
          />

          {step === 'request' ? (
            <>
              <h1 className="mt-5 text-2xl font-semibold text-foreground">
                Reset your PIN
              </h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Enter your registration number and we'll text a code to the
                phone number on file.
              </p>

              <form
                onSubmit={requestForm.handleSubmit((values) =>
                  requestMutation.mutate(values),
                )}
                className="flex flex-col"
              >
                {requestForm.formState.errors.root && (
                  <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {requestForm.formState.errors.root.message}
                  </div>
                )}

                <Input
                  placeholder="Registration number"
                  className={underlineInputClass}
                  {...requestForm.register('registrationNumber')}
                />
                {requestForm.formState.errors.registrationNumber && (
                  <p className="mt-1 text-xs text-destructive">
                    {requestForm.formState.errors.registrationNumber.message}
                  </p>
                )}

                <div className="mt-8 flex items-center justify-end gap-2">
                  <Button
                    asChild
                    variant="secondary"
                    className="min-w-24 rounded-sm"
                  >
                    <Link to="/student/login">Back</Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={requestMutation.isPending}
                    className="min-w-24 rounded-sm"
                  >
                    {requestMutation.isPending ? 'Sending...' : 'Send code'}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-2xl font-semibold text-foreground">
                Enter your code
              </h1>
              <p className="mb-6 text-sm text-muted-foreground">
                We sent a 6-digit code to {maskedPhone}. It expires in 10
                minutes.
              </p>

              <form
                onSubmit={resetForm.handleSubmit((values) =>
                  resetMutation.mutate(values),
                )}
                className="flex flex-col"
              >
                {resetForm.formState.errors.root && (
                  <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {resetForm.formState.errors.root.message}
                  </div>
                )}

                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                  className={underlineInputClass}
                  {...resetForm.register('otp')}
                />
                {resetForm.formState.errors.otp && (
                  <p className="mt-1 text-xs text-destructive">
                    {resetForm.formState.errors.otp.message}
                  </p>
                )}

                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="New 4-digit PIN"
                  className={`mt-5 ${underlineInputClass}`}
                  {...resetForm.register('newPin')}
                />
                {resetForm.formState.errors.newPin && (
                  <p className="mt-1 text-xs text-destructive">
                    {resetForm.formState.errors.newPin.message}
                  </p>
                )}

                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Confirm new PIN"
                  className={`mt-5 ${underlineInputClass}`}
                  {...resetForm.register('confirmNewPin')}
                />
                {resetForm.formState.errors.confirmNewPin && (
                  <p className="mt-1 text-xs text-destructive">
                    {resetForm.formState.errors.confirmNewPin.message}
                  </p>
                )}

                <p className="mt-5 text-[13px] text-muted-foreground">
                  Didn't get a code?{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() =>
                      requestMutation.mutate({ registrationNumber })
                    }
                  >
                    Resend
                  </button>
                </p>

                <div className="mt-8 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-w-24 rounded-sm"
                    onClick={() => setStep('request')}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={resetMutation.isPending}
                    className="min-w-24 rounded-sm"
                  >
                    {resetMutation.isPending ? 'Saving...' : 'Reset PIN'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
