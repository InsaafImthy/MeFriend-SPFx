using MeFriend.Api.Models.Common;
using MeFriend.Api.Models.Events;

namespace MeFriend.Api.Services;

public sealed class BusinessCentralEventService : IBusinessCentralEventService
{
    public Task<ApiResponse<PagedResult<EventListItemDto>>> GetEventsAsync(
        EventFilterRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(ApiResponse<PagedResult<EventListItemDto>>.Fail(
            "EventApiPending",
            "Business Central API contract for this operation is not configured yet."));
    }

    public Task<ApiResponse<EventDetailDto>> GetEventByIdAsync(string id, CancellationToken cancellationToken)
    {
        return Task.FromResult(ApiResponse<EventDetailDto>.Fail(
            "EventApiPending",
            "Business Central API contract for this operation is not configured yet."));
    }
}
