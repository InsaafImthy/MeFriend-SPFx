namespace MeFriend.Api.Models.SalesOrders;

public class SalesOrderListItemDto
{
    public string Id { get; init; } = string.Empty;
    public string SalesOrderNumber { get; init; } = string.Empty;
    public string CustomerCode { get; init; } = string.Empty;
    public string CustomerName { get; init; } = string.Empty;
    public string SalespersonCode { get; init; } = string.Empty;
    public string SalespersonName { get; init; } = string.Empty;
    public string EventCode { get; init; } = string.Empty;
    public string EventName { get; init; } = string.Empty;
    public DateOnly? OrderDate { get; init; }
    public string Status { get; init; } = string.Empty;
    public decimal TotalAmount { get; init; }
    public string CurrencyCode { get; init; } = string.Empty;
}
