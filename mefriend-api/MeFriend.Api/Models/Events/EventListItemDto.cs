namespace MeFriend.Api.Models.Events;

public sealed class EventListItemDto
{
    public string Id { get; init; } = string.Empty;
    public string EventCode { get; init; } = string.Empty;
    public string EventName { get; init; } = string.Empty;
    public DateOnly? StartDate { get; init; }
    public DateOnly? EndDate { get; init; }
    public string Status { get; init; } = string.Empty;
}
