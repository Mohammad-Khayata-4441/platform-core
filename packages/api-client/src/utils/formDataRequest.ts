export const formDataRequest = (dto: unknown): RequestInit => ({
    body: JSON.stringify(dto),
    headers: { 'Content-Type': 'multipart/form-data' }
})