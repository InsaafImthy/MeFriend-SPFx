using MeFriend.Api.Models.Common;
using MeFriend.Api.Models.Invoices;

namespace MeFriend.Api.Services;

public sealed class BusinessCentralInvoiceService : IBusinessCentralInvoiceService
{
    public Task<ApiResponse<PagedResult<InvoiceListItemDto>>> GetInvoicesAsync(
        InvoiceFilterRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(ApiResponse<PagedResult<InvoiceListItemDto>>.Fail(
            "InvoiceApiPending",
            "Business Central API contract for this operation is not configured yet."));
    }

    public Task<ApiResponse<InvoiceDetailDto>> GetInvoiceByIdAsync(string id, CancellationToken cancellationToken)
    {
        return Task.FromResult(ApiResponse<InvoiceDetailDto>.Fail(
            "InvoiceApiPending",
            "Business Central API contract for this operation is not configured yet."));
    }

    public Task<ApiResponse<PagedResult<InvoiceListItemDto>>> GetOutstandingInvoicesAsync(
        InvoiceFilterRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(ApiResponse<PagedResult<InvoiceListItemDto>>.Fail(
            "InvoiceApiPending",
            "Business Central API contract for this operation is not configured yet."));
    }

    public Task<ApiResponse<PagedResult<InvoiceListItemDto>>> GetInvoicesBySalesOrderIdAsync(
        string salesOrderId,
        InvoiceFilterRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(ApiResponse<PagedResult<InvoiceListItemDto>>.Fail(
            "InvoiceApiPending",
            "Business Central API contract for this operation is not configured yet."));
    }
}
