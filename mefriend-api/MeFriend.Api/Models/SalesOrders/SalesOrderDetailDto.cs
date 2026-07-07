namespace MeFriend.Api.Models.SalesOrders;

public sealed class SalesOrderDetailDto : SalesOrderListItemDto
{
    public IReadOnlyCollection<SalesOrderLineItemDto> Lines { get; init; } = Array.Empty<SalesOrderLineItemDto>();
    public IReadOnlyCollection<SalesOrderRelatedInvoiceDto> RelatedInvoices { get; init; } =
        Array.Empty<SalesOrderRelatedInvoiceDto>();
    public SalesOrderInvoiceSummaryDto InvoiceSummary { get; init; } = new();
}
