namespace MeFriend.Api.Models.Invoices;

public sealed class InvoiceLineItemDto
{
    public string LineNumber { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal LineAmount { get; init; }
}
