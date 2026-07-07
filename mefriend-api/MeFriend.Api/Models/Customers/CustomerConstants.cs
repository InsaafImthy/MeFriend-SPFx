namespace MeFriend.Api.Models.Customers;

public static class CustomerConstants
{
    public static readonly IReadOnlySet<string> AllowedBranches = new HashSet<string>(
        new[] { "CLT", "MPM", "TVM", "TSR", "CHN", "KTM", "CORP", "KNR" },
        StringComparer.OrdinalIgnoreCase);

    public static readonly IReadOnlySet<string> AllowedDepartments = new HashSet<string>(
        new[] { "CIR", "ADVT" },
        StringComparer.OrdinalIgnoreCase);

    public const string BranchDimensionCode = "BRANCH";
    public const string DepartmentDimensionCode = "DEPARTMENT";
    public const string ProductDimensionCode = "PRODUCT";
    public const string DefaultProductDimensionValue = "Dly";
}
