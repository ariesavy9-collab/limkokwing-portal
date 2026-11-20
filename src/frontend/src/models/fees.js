import { services as defaultServices } from './services';

export function getRequestFeeAmount(request) {
  if (Number.isFinite(request.feeAmount)) return request.feeAmount;
  const fee = request.fee || defaultServices.find((service) => service.id === request.serviceId)?.fee || '';
  return Number(fee.match(/[0-9]+(?:\.[0-9]+)?/)?.[0] || 0);
}
