export interface PhoneDetectionResult {
  original: string;
  phone_norm: string;
  country_code: string;
  nsn: string;
  is_mobile: boolean;
  whatsapp_confidence: number;
  mobile_detection_reason: string;
}

export interface CountryMobileRules {
  [country: string]: {
    cc: string;
    prefixes: string[];
    nsnLength: { min: number; max: number };
  };
}

export const COUNTRY_RULES: CountryMobileRules = {
  Morocco: { cc: '212', prefixes: ['6', '7'], nsnLength: { min: 9, max: 9 } },
  Senegal: { cc: '221', prefixes: ['70', '76', '77', '78'], nsnLength: { min: 9, max: 9 } },
  Tunisia: { cc: '216', prefixes: ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '90', '91', '92', '93', '94', '95'], nsnLength: { min: 8, max: 8 } },
  Guinea: { cc: '224', prefixes: ['60', '62', '63', '64', '65', '66', '67', '68', '69', '77'], nsnLength: { min: 8, max: 8 } },
  Cameroon: { cc: '237', prefixes: ['650', '651', '652', '653', '654', '655', '656', '657', '658', '659', '670', '671', '672', '673', '674', '675', '676', '677', '678', '679'], nsnLength: { min: 8, max: 9 } },
  'Ivory Coast': { cc: '225', prefixes: ['01', '05', '07', '25', '27', '55', '57'], nsnLength: { min: 8, max: 8 } },
};

export class PhoneDetectionService {
  static normalizePhone(phone: string): string {
    // Remove spaces, dots, parentheses, hyphens, etc.
    let normalized = phone.replace(/[\s\.\(\)\-]/g, '');
    // Convert 00 to +
    if (normalized.startsWith('00')) {
      normalized = '+' + normalized.substring(2);
    }
    return normalized;
  }

  static detectCountryFromPhone(phone: string, callCenterCountry?: string): string | null {
    const normalized = this.normalizePhone(phone);
    // Extract country code
    if (normalized.startsWith('+')) {
      for (const country in COUNTRY_RULES) {
        if (normalized.startsWith('+' + COUNTRY_RULES[country].cc)) {
          return country;
        }
      }
    } else {
      // Try to detect country code without '+'
      for (const country in COUNTRY_RULES) {
        const cc = COUNTRY_RULES[country].cc;
        if (normalized.startsWith(cc)) {
          return country;
        }
      }
      // If starts with '0' and callCenterCountry provided, use it
      if (normalized.startsWith('0') && callCenterCountry) {
        return callCenterCountry;
      }
    }
    return null;
  }

  static detectMobile(phone: string, country: string): PhoneDetectionResult {
    const normalized = this.normalizePhone(phone);
    const rules = COUNTRY_RULES[country];

    if (!rules) {
      return {
        original: phone,
        phone_norm: normalized,
        country_code: '',
        nsn: normalized,
        is_mobile: false,
        whatsapp_confidence: 0.2,
        mobile_detection_reason: 'Unknown country'
      };
    }

    let cc = rules.cc;
    let nsn = normalized;

    if (normalized.startsWith('+')) {
      if (normalized.startsWith('+' + cc)) {
        nsn = normalized.substring(cc.length + 1);
      } else {
        // Different country code - find matching country
        let detectedCountry = null;
        for (const c in COUNTRY_RULES) {
          if (normalized.startsWith('+' + COUNTRY_RULES[c].cc)) {
            detectedCountry = c;
            cc = COUNTRY_RULES[c].cc;
            nsn = normalized.substring(cc.length + 1);
            break;
          }
        }
        if (!detectedCountry) {
          // Fallback: assume first 1-3 digits are country code
          cc = normalized.substring(1, 4);
          nsn = normalized.substring(cc.length + 1);
        }
      }
    } else {
      // No '+', check if starts with country code
      if (normalized.startsWith(cc)) {
        nsn = normalized.substring(cc.length);
      } else {
        // Assume it's NSN if length matches, else fallback
        if (normalized.length >= rules.nsnLength.min && normalized.length <= rules.nsnLength.max) {
          nsn = normalized;
        } else {
          // Try to strip leading 0 or other prefixes
          let stripped = normalized;
          if (stripped.startsWith('0')) {
            stripped = stripped.substring(1);
          }
          if (stripped.length >= rules.nsnLength.min && stripped.length <= rules.nsnLength.max) {
            nsn = stripped;
          } else {
            nsn = normalized; // Keep as is
          }
        }
      }
    }

    const phone_norm = '+' + cc + nsn;

    // Check prefix
    const prefix = nsn.substring(0, Math.min(3, nsn.length));
    const isPrefixMatch = rules.prefixes.some(p => prefix.startsWith(p));

    // Check length
    const lengthMatch = nsn.length >= rules.nsnLength.min && nsn.length <= rules.nsnLength.max;

    let confidence = 0.2;
    let reason = 'No match';
    let isMobile = false;

    if (isPrefixMatch && lengthMatch) {
      confidence = 0.98;
      reason = 'Prefix and length match';
      isMobile = true;
    } else if (isPrefixMatch) {
      confidence = 0.85;
      reason = 'Prefix match, length mismatch';
      isMobile = true;
    } else if (lengthMatch) {
      confidence = 0.6;
      reason = 'Length match only';
      isMobile = false; // Not sure
    } else if (nsn.startsWith('6') || nsn.startsWith('7')) {
      confidence = 0.7;
      reason = 'Starts with 6 or 7, likely mobile';
      isMobile = true;
    }

    // Only hide WhatsApp if confidence is very low
    if (confidence < 0.7) {
      isMobile = false;
    }

    return {
      original: phone,
      phone_norm,
      country_code: cc,
      nsn,
      is_mobile: isMobile,
      whatsapp_confidence: confidence,
      mobile_detection_reason: reason
    };
  }

  static detectPhone(phone: string, callCenterCountry?: string): PhoneDetectionResult {
    const country = this.detectCountryFromPhone(phone, callCenterCountry);
    if (country) {
      return this.detectMobile(phone, country);
    }
    // Fallback: try to detect based on common patterns
    const normalized = this.normalizePhone(phone);
    let possibleCountry = null;
    for (const c in COUNTRY_RULES) {
      const rules = COUNTRY_RULES[c];
      let nsn = normalized;
      if (normalized.startsWith(rules.cc)) {
        nsn = normalized.substring(rules.cc.length);
      } else if (normalized.startsWith('0') && normalized.length === rules.cc.length + rules.nsnLength.min) {
        nsn = normalized.substring(1);
      }
      if (nsn.length >= rules.nsnLength.min && nsn.length <= rules.nsnLength.max) {
        const prefix = nsn.substring(0, Math.min(3, nsn.length));
        if (rules.prefixes.some(p => prefix.startsWith(p))) {
          possibleCountry = c;
          break;
        }
      }
    }
    if (possibleCountry) {
      return this.detectMobile(phone, possibleCountry);
    }
    // Final fallback
    return {
      original: phone,
      phone_norm: normalized,
      country_code: '',
      nsn: normalized,
      is_mobile: false,
      whatsapp_confidence: 0.2,
      mobile_detection_reason: 'Country not detected'
    };
  }

  static getWhatsAppLink(phone: string): string {
    const normalized = this.normalizePhone(phone);
    if (normalized.startsWith('+')) {
      return `https://wa.me/${normalized.substring(1)}`;
    }
    return `https://wa.me/${normalized}`;
  }
}