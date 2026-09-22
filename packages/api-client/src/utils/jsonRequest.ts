 
export const jsonRequest = (dto: unknown): Partial<RequestInit> => ({
    body: JSON.stringify(dto),
    headers: { 'Content-Type': 'application/json' }
})