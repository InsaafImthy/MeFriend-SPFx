namespace MeFriend.Api.Models.Invoices;

public sealed class InvoiceDetailDto : InvoiceListItemDto
{
    public IReadOnlyCollection<InvoiceLineItemDto> Lines { get; init; } = Array.Empty<InvoiceLineItemDto>();
}
