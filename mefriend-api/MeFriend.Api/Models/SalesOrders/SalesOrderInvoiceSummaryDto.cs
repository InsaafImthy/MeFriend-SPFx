namespace MeFriend.Api.Models.SalesOrders;

public sealed class SalesOrderInvoiceSummaryDto
{
    public int InvoiceCount { get; init; }
    public int OutstandingInvoiceCount { get; init; }
    public decimal TotalInvoicedAmount { get; init; }
    public decimal TotalPaidAmount { get; init; }
    public decimal TotalOutstandingAmount { get; init; }
}
