/**
 * Government net metering / PM Surya Ghar tariff data.
 *
 * Static state-wise residential electricity tariff + net-metering export credit
 * rates (₹/kWh) for India. Export rates are representative figures in line with
 * typical state DISCOM net-metering / feed-in credit values published at
 * https://electricbill.in/ — verify against your state DISCOM for exact values.
 */

import { reverseGeocode } from '../services/geo';

const STATE_TARIFFS = {
  'Andhra Pradesh': { rate: 3.2, label: 'Andhra Pradesh', exportCredit: 3.2 },
  'Assam': { rate: 3.5, label: 'Assam', exportCredit: 3.5 },
  'Bihar': { rate: 3.4, label: 'Bihar', exportCredit: 3.4 },
  'Chhattisgarh': { rate: 3.0, label: 'Chhattisgarh', exportCredit: 3.0 },
  'Delhi': { rate: 3.9, label: 'Delhi', exportCredit: 3.9 },
  'Goa': { rate: 3.3, label: 'Goa', exportCredit: 3.3 },
  'Gujarat': { rate: 3.0, label: 'Gujarat', exportCredit: 3.0 },
  'Haryana': { rate: 3.1, label: 'Haryana', exportCredit: 3.1 },
  'Himachal Pradesh': { rate: 3.4, label: 'Himachal Pradesh', exportCredit: 3.4 },
  'Jammu & Kashmir': { rate: 3.0, label: 'Jammu & Kashmir', exportCredit: 3.0 },
  'Jharkhand': { rate: 3.2, label: 'Jharkhand', exportCredit: 3.2 },
  'Karnataka': { rate: 3.1, label: 'Karnataka', exportCredit: 3.1 },
  'Kerala': { rate: 3.3, label: 'Kerala', exportCredit: 3.3 },
  'Madhya Pradesh': { rate: 3.0, label: 'Madhya Pradesh', exportCredit: 3.0 },
  'Maharashtra': { rate: 3.5, label: 'Maharashtra', exportCredit: 3.5 },
  'Manipur': { rate: 3.0, label: 'Manipur', exportCredit: 3.0 },
  'Meghalaya': { rate: 3.0, label: 'Meghalaya', exportCredit: 3.0 },
  'Mizoram': { rate: 3.0, label: 'Mizoram', exportCredit: 3.0 },
  'Nagaland': { rate: 3.0, label: 'Nagaland', exportCredit: 3.0 },
  'Odisha': { rate: 3.0, label: 'Odisha', exportCredit: 3.0 },
  'Puducherry': { rate: 3.0, label: 'Puducherry', exportCredit: 3.0 },
  'Punjab': { rate: 3.0, label: 'Punjab', exportCredit: 3.0 },
  'Rajasthan': { rate: 3.4, label: 'Rajasthan', exportCredit: 3.4 },
  'Sikkim': { rate: 3.0, label: 'Sikkim', exportCredit: 3.0 },
  'Tamil Nadu': { rate: 3.1, label: 'Tamil Nadu', exportCredit: 3.1 },
  'Telangana': { rate: 3.2, label: 'Telangana', exportCredit: 3.2 },
  'Tripura': { rate: 3.0, label: 'Tripura', exportCredit: 3.0 },
  'Uttar Pradesh': { rate: 3.1, label: 'Uttar Pradesh', exportCredit: 3.1 },
  'Uttarakhand': { rate: 3.4, label: 'Uttarakhand', exportCredit: 3.4 },
  'West Bengal': { rate: 3.5, label: 'West Bengal', exportCredit: 3.5 },
};

const DEFAULT_TARIFF = {
  rate: 3.0,
  label: 'Default (national average)',
  exportCredit: 3.0,
};

const STATE_ALIASES = {
  'delhi ncr': 'Delhi',
  'new delhi': 'Delhi',
  'jammu and kashmir': 'Jammu & Kashmir',
  'j&k': 'Jammu & Kashmir',
  'tamilnadu': 'Tamil Nadu',
  'uttar pradesh': 'Uttar Pradesh',
  'west bengal': 'West Bengal',
  'andhra pradesh': 'Andhra Pradesh',
  'arunachal pradesh': 'Arunachal Pradesh',
};

export function normalizeStateName(stateName) {
  if (!stateName) return '';
  const trimmed = String(stateName).trim();
  const key = trimmed.toLowerCase();
  if (STATE_TARIFFS[trimmed]) return trimmed;
  return STATE_ALIASES[key] || trimmed;
}

export function getTariffForState(stateName) {
  const normalized = normalizeStateName(stateName);
  return STATE_TARIFFS[normalized] || { ...DEFAULT_TARIFF, detected: stateName || null };
}

export async function getStateFromCoordinates(latitude, longitude) {
  const geo = await reverseGeocode(latitude, longitude);
  return geo?.state ? normalizeStateName(geo.state) : null;
}

export async function getTariffForCoordinates(latitude, longitude) {
  const state = await getStateFromCoordinates(latitude, longitude);
  return { state, tariff: getTariffForState(state) };
}

export function getTariffByStateOrDefault(stateName) {
  return getTariffForState(stateName);
}

export const SCHEME_URL = 'https://electricbill.in/';
export const PM_SURYAGHAR_URL = 'https://www.pmsuryaghar.gov.in/';