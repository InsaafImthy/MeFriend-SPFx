namespace MeFriend.Api.Models.Customers;

public sealed class CustomerCreateResponse
{
    public string? CustomerCode { get; init; }
    public string? CustomerName { get; init; }
    public string? BusinessCentralDocumentNumber { get; init; }
    public string? RawReference { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}
