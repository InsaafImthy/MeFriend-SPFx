namespace MeFriend.Api.Models.Invoices;

public class InvoiceListItemDto
{
    public string Id { get; init; } = string.Empty;
    public string InvoiceNumber { get; init; } = string.Empty;
    public string CustomerCode { get; init; } = string.Empty;
    public string CustomerName { get; init; } = string.Empty;
    public string SalesOrderNumber { get; init; } = string.Empty;
    public DateOnly? InvoiceDate { get; init; }
    public DateOnly? DueDate { get; init; }
    public decimal TotalAmount { get; init; }
    public decimal? PaidAmount { get; init; }
    public decimal? OutstandingAmount { get; init; }
    public string PaymentStatus { get; init; } = string.Empty;
    public string InvoiceStatus { get; init; } = string.Empty;
    public string CurrencyCode { get; init; } = string.Empty;
}
