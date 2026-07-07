namespace MeFriend.Api.Models.SalesOrders;

public sealed class SalesOrderCreateRequest
{
    public string CustomerCode { get; init; } = string.Empty;
    public string SalespersonCode { get; init; } = string.Empty;
    public DateOnly? OrderDate { get; init; }
    public IReadOnlyCollection<SalesOrderLineItemDto> Lines { get; init; } = Array.Empty<SalesOrderLineItemDto>();
}
