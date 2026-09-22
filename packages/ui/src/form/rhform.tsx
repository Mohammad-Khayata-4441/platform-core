"use client"

import type { FieldValues, SubmitErrorHandler } from "react-hook-form"
import { FormProvider } from "react-hook-form"
import type { RhformProps } from "./types"
import { cn } from "../lib/cn"
 export function Rhform<TValues extends FieldValues>({
  form,
  onSubmit,
  errorHandler,
  children,
  className,
}: RhformProps<TValues>) {
  const handleErrors: SubmitErrorHandler<TValues> = (ers) => {
    console.error("Form submission errors:", ers)
    errorHandler?.(ers)
  }
  return (
    <FormProvider {...form}>
      <form
        onSubmit={(e) => { e.stopPropagation(); form.handleSubmit(onSubmit, handleErrors)(e) }}
        noValidate
        className={cn('p-2', className)}
      >
        {children}
      </form>


      {/* <Alert>
        <AlertTitle>

      {JSON.stringify(form.formState.errors)}
        </AlertTitle>
      </Alert> */}



    </FormProvider>
  )
}

