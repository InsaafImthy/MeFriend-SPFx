using MeFriend.Api.Models.Common;
using MeFriend.Api.Models.Events;

namespace MeFriend.Api.Services;

public interface IBusinessCentralEventService
{
    Task<ApiResponse<PagedResult<EventListItemDto>>> GetEventsAsync(
        EventFilterRequest request,
        CancellationToken cancellationToken);
    Task<ApiResponse<EventDetailDto>> GetEventByIdAsync(string id, CancellationToken cancellationToken);
}
