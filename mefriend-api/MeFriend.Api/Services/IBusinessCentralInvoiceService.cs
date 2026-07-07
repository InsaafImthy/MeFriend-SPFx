using MeFriend.Api.Models.Common;
using MeFriend.Api.Models.Invoices;

namespace MeFriend.Api.Services;

public interface IBusinessCentralInvoiceService
{
    Task<ApiResponse<PagedResult<InvoiceListItemDto>>> GetInvoicesAsync(
        InvoiceFilterRequest request,
        CancellationToken cancellationToken);
    Task<ApiResponse<InvoiceDetailDto>> GetInvoiceByIdAsync(string id, CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<InvoiceListItemDto>>> GetOutstandingInvoicesAsync(
        InvoiceFilterRequest request,
        CancellationToken cancellationToken);
    Task<ApiResponse<PagedResult<InvoiceListItemDto>>> GetInvoicesBySalesOrderIdAsync(
        string salesOrderId,
        InvoiceFilterRequest request,
        CancellationToken cancellationToken);
}
