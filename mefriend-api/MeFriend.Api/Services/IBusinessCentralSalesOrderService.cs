using MeFriend.Api.Models.Common;
using MeFriend.Api.Models.SalesOrders;

namespace MeFriend.Api.Services;

public interface IBusinessCentralSalesOrderService
{
    Task<ApiResponse<PagedResult<SalesOrderListItemDto>>> GetSalesOrdersAsync(CancellationToken cancellationToken);
    Task<ApiResponse<SalesOrderDetailDto>> GetSalesOrderByIdAsync(string id, CancellationToken cancellationToken);
    Task<ApiResponse<SalesOrderDetailDto>> CreateSalesOrderAsync(
        SalesOrderCreateRequest request,
        CancellationToken cancellationToken);
    Task<ApiResponse<IReadOnlyList<SalesOrderRelatedInvoiceDto>>> GetInvoicesForSalesOrderAsync(
        string id,
        CancellationToken cancellationToken);
}
