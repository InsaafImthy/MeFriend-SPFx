namespace MeFriend.Api.Models.Invoices;

public sealed class InvoiceFilterRequest
{
    public string? SearchText { get; init; }
    public string? CustomerCode { get; init; }
    public string? SalesOrderReference { get; init; }
    public string? PaymentStatus { get; init; }
    public bool? OutstandingOnly { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 25;
}
