namespace MeFriend.Api.Models.Events;

public sealed class EventFilterRequest
{
    public string? SearchText { get; init; }
    public string? Status { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 25;
}
