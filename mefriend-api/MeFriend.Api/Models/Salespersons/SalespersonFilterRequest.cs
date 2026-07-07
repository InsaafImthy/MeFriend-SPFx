namespace MeFriend.Api.Models.Salespersons;

public sealed class SalespersonFilterRequest
{
    public string? SearchText { get; init; }
    public string? Status { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 25;
}
