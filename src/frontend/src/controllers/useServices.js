import { useEffect, useState } from 'react';
import { subscribeToServices } from '../models/portalRepository';
import { services as defaultServices } from '../models/services';

export default function useServices() {
  const [customServices, setCustomServices] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => subscribeToServices((items) => {
    setCustomServices(items);
    setError('');
  }, (failure) => {
    setError(failure.message || 'Additional services could not be loaded.');
  }), []);

  const customById = new Map(customServices.map((service) => [service.id, service]));
  const defaultIds = new Set(defaultServices.map((service) => service.id));
  const availableServices = [
    ...defaultServices.map((service) => ({ ...service, ...customById.get(service.id) })),
    ...customServices.filter((service) => !defaultIds.has(service.id)),
  ].filter((service) => service.active !== false);

  return { services: availableServices, error };
}
