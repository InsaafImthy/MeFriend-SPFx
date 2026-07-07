import * as React from 'react';
import { eventsModuleConfig } from '../../../config/modules/eventsModuleConfig';
import type { IEventDetail } from '../../../models/events';
import { getUserFriendlyError, normalizeError } from '../../../services/api/apiErrorHandler';
import type { EventService } from '../../../services/events/eventService';
import { DetailViewLayout } from '../../common/detailView/DetailViewLayout';

export interface IEventDetailPageProps {
  eventId: string;
  eventService: EventService;
  onNavigate: (path: string) => void;
}

const getDetailErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Event detail API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

export const EventDetailPage: React.FC<IEventDetailPageProps> = ({ eventId, eventService, onNavigate }) => {
  const [event, setEvent] = React.useState<IEventDetail | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (!eventsModuleConfig.detailEnabled) {
      return;
    }

    const loadEvent = async (): Promise<void> => {
      setLoading(true);
      setError(undefined);

      try {
        setEvent(await eventService.getEventById(eventId));
      } catch (loadError) {
        setEvent(undefined);
        setError(getDetailErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    loadEvent().catch(() => undefined);
  }, [eventId, eventService]);

  if (!eventsModuleConfig.detailEnabled) {
    return (
      <DetailViewLayout
        title="Event Detail"
        subtitle={eventId ? `Event reference: ${eventId}` : undefined}
        backLabel="Back to Events"
        onBack={() => onNavigate(eventsModuleConfig.route)}
        sections={[
          {
            title: 'Event Information',
            customContent: <p>Event detail API is not configured yet.</p>
          }
        ]}
      />
    );
  }

  return (
    <DetailViewLayout
      title="Event Detail"
      subtitle={event ? event.eventName || event.eventCode : eventId ? `Event reference: ${eventId}` : undefined}
      backLabel="Back to Events"
      onBack={() => onNavigate(eventsModuleConfig.route)}
      loading={loading}
      error={error}
      sections={[
        {
          title: 'Event Information',
          fields: [
            { key: 'eventCode', label: 'Event Code', value: event?.eventCode },
            { key: 'eventName', label: 'Event Name', value: event?.eventName },
            { key: 'startDate', label: 'Start Date', value: event?.startDate, renderType: 'date' },
            { key: 'endDate', label: 'End Date', value: event?.endDate, renderType: 'date' },
            { key: 'status', label: 'Status', value: event?.status, renderType: 'status' },
            { key: 'venue', label: 'Venue', value: event?.venue },
            { key: 'description', label: 'Description', value: event?.description }
          ]
        }
      ]}
    />
  );
};
