using MeFriend.Api.Models.SalesOrders;

namespace MeFriend.Api.Mappers;

public static class SalesOrderMapper
{
    public static SalesOrderInvoiceSummaryDto BuildInvoiceSummary(
        IReadOnlyCollection<SalesOrderRelatedInvoiceDto> relatedInvoices)
    {
        return new SalesOrderInvoiceSummaryDto
        {
            InvoiceCount = relatedInvoices.Count,
            OutstandingInvoiceCount = relatedInvoices.Count(invoice => (invoice.OutstandingAmount ?? 0) > 0),
            TotalInvoicedAmount = relatedInvoices.Sum(invoice => invoice.TotalAmount),
            TotalPaidAmount = relatedInvoices.Sum(invoice => invoice.PaidAmount ?? 0),
            TotalOutstandingAmount = relatedInvoices.Sum(invoice => invoice.OutstandingAmount ?? 0)
        };
    }
}
