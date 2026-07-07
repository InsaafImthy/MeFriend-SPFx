namespace MeFriend.Api.Models.Salespersons;

public sealed class SalespersonListItemDto
{
    public string Id { get; init; } = string.Empty;
    public string SalespersonCode { get; init; } = string.Empty;
    public string SalespersonName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
}
