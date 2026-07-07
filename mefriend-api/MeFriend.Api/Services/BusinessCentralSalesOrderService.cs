using MeFriend.Api.Models.Common;
using MeFriend.Api.Models.SalesOrders;

namespace MeFriend.Api.Services;

public sealed class BusinessCentralSalesOrderService : IBusinessCentralSalesOrderService
{
    public Task<ApiResponse<PagedResult<SalesOrderListItemDto>>> GetSalesOrdersAsync(CancellationToken cancellationToken)
    {
        return Task.FromResult(ApiResponse<PagedResult<SalesOrderListItemDto>>.Fail(
            "SalesOrderApiPending",
            "Business Central API contract for this operation is not configured yet."));
    }

    public Task<ApiResponse<SalesOrderDetailDto>> GetSalesOrderByIdAsync(string id, CancellationToken cancellationToken)
    {
        return Task.FromResult(ApiResponse<SalesOrderDetailDto>.Fail(
            "SalesOrderApiPending",
            "Business Central API contract for this operation is not configured yet."));
    }

    public Task<ApiResponse<SalesOrderDetailDto>> CreateSalesOrderAsync(
        SalesOrderCreateRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(ApiResponse<SalesOrderDetailDto>.Fail(
            "SalesOrderCreateNotImplemented",
            "Business Central API contract for this operation is not configured yet."));
    }

    public Task<ApiResponse<IReadOnlyList<SalesOrderRelatedInvoiceDto>>> GetInvoicesForSalesOrderAsync(
        string id,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(ApiResponse<IReadOnlyList<SalesOrderRelatedInvoiceDto>>.Fail(
            "SalesOrderInvoicesApiPending",
            "Business Central API contract for this operation is not configured yet."));
    }
}
