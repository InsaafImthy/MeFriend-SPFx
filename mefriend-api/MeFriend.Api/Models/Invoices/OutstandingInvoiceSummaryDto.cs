namespace MeFriend.Api.Models.Invoices;

public sealed class OutstandingInvoiceSummaryDto
{
    public int InvoiceCount { get; init; }
    public decimal TotalInvoiceAmount { get; init; }
    public decimal TotalPaidAmount { get; init; }
    public decimal TotalOutstandingAmount { get; init; }
}
