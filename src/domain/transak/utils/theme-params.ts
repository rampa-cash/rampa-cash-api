/**
 * Theme configuration for Transak widget
 * Colors match the mobile app theme constants
 */

export interface ThemeParams {
    themeColor: string;
    colorMode: 'LIGHT' | 'DARK';
    backgroundColors: string;
    textColors: string;
    borderColors: string;
}

const BRAND_COLORS = {
    primary: '#784AE5', // Signal Violet (from mobile app constants/theme.ts)
};

const THEME_PARAMS: Record<
    'LIGHT' | 'DARK',
    Omit<ThemeParams, 'themeColor'>
> = {
    LIGHT: {
        colorMode: 'LIGHT' as const,
        backgroundColors: '#FFFFFF,#F5F6F8,#E4E7EB',
        textColors: '#11181C,#757F8A,#9BA1A6',
        borderColors: '#E6E8EC,#C9CFD6,#F0F2F5',
    },
    DARK: {
        colorMode: 'DARK' as const,
        backgroundColors: '#0C0C0C,#151718,#242629',
        textColors: '#ECEDEE,#9BA1A6,#7B8793',
        borderColors: '#2C2F33,#383C41,#1A1D20',
    },
};

/**
 * Get theme parameters for Transak widget based on theme mode
 *
 * @param themeMode - Theme mode from mobile app ('LIGHT' or 'DARK')
 * @returns Theme parameters object with all required colors
 *
 * @example
 * getThemeParams('DARK') // Returns dark theme with brand colors
 * getThemeParams() // Returns light theme (default)
 */
export function getThemeParams(themeMode?: 'LIGHT' | 'DARK'): ThemeParams {
    return {
        themeColor: BRAND_COLORS.primary,
        ...(themeMode ? THEME_PARAMS[themeMode] : THEME_PARAMS.LIGHT),
    };
}
