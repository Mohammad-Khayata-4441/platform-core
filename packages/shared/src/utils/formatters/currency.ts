export interface FormatCurrencyOptions {
    locale?: string
    decimalPlaces?: number
    /** Currency symbol from API data. If omitted, falls back to Intl native symbol. */
    symbol?: string
    /** 'BEFORE' (default) or 'AFTER' */
    symbolPosition?: string | null
}

export function formatCurrency(
    amount: number,
    currencyCode: string,
    options: FormatCurrencyOptions = {}
): string {
    const { locale = 'en-US', decimalPlaces = 2, symbol, symbolPosition } = options

    const formattedNumber = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
    }).format(amount)

    if (symbol) {
        return symbolPosition === 'AFTER'
            ? `${formattedNumber} ${symbol}`
            : `${symbol}${formattedNumber}`
    }

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
    }).format(amount)
}

/** Format a MoneyAmount object using its embedded currency symbol and position from the API. */
export function formatMoneyAmount(
    money: {
        amount: number
        currency: {
            symbol: string
            symbolPosition?: string | null
            decimalPlaces: number
        }
    },
    locale?: string
): string {
    return formatCurrency(money.amount, '', {
        locale,
        decimalPlaces: money.currency.decimalPlaces,
        symbol: money.currency.symbol,
        symbolPosition: money.currency.symbolPosition,
    })
}
