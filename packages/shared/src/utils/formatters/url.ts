export const urlFormatter = {
    whatsapp: (phone: string, countryCode='963', message='') => `https://wa.me/${countryCode}${(phone.startsWith('0') ? phone.slice(1) : phone).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`,
    telegram: (username: string) => `https://t.me/${username.replace(/@/g, "")}`,
    facebook: (username: string) => `https://www.facebook.com/${username}`,
    instagram: (username: string) => `https://www.instagram.com/${username}`,
    twitter: (username: string) => `https://twitter.com/${username}`,
    tel: (phone: string) => `tel:${phone.replace(/[^0-9]/g, "")}`,
    email: (email: string) => `mailto:${email}`,
}