from scipy import stats
from enum import Enum

class uplift_mode(str, Enum):
    ABSOLUTE = "absolute"
    RELATIVE = "relative"

class test_type(str, Enum):
    TWO_SIDED = "two-sided"
    ONE_SIDED = "one-sided"

def calculate_result_significance(p1: float, p2: float, n1: int, n2: int, alpha: float = 0.05, test_type: test_type = test_type.TWO_SIDED) -> bool:
    """
    Calculate the statistical significance of the difference between two proportions.

    Args:
        p1 (float): Proportion of successes in group 1.
        p2 (float): Proportion of successes in group 2.
        n1 (int): Sample size of group 1.
        n2 (int): Sample size of group 2.
        alpha (float): Significance level (default is 0.05).

    Returns:
        bool: True if the difference is statistically significant, False otherwise.
    """
    # Calculate the pooled proportion
    pooled_p = (p1 * n1 + p2 * n2) / (n1 + n2)
    
    # Calculate the standard error
    se = ((pooled_p * (1 - pooled_p)) * (1/n1 + 1/n2)) ** 0.5
    
    # Calculate the z-score
    z_score = (p1 - p2) / se
    
    # Calculate the critical z-value for the given alpha
    if test_type == test_type.TWO_SIDED:
        critical_z = stats.norm.ppf(1 - alpha / 2)
        return bool(abs(z_score) > critical_z)
    else:
        critical_z = stats.norm.ppf(1 - alpha)
        return bool(z_score > critical_z)

def calculate_result_p_value(p1: float, p2: float, n1: int, n2: int, test_type: test_type = test_type.TWO_SIDED) -> float:
    """
    Calculate the p-value for the difference between two proportions.

    Args:
        p1 (float): Proportion of successes in group 1.
        p2 (float): Proportion of successes in group 2.
        n1 (int): Sample size of group 1.
        n2 (int): Sample size of group 2.

    Returns:
        float: The calculated p-value.
    """
    # Calculate the pooled proportion
    pooled_p = (p1 * n1 + p2 * n2) / (n1 + n2)
    
    # Calculate the standard error
    se = ((pooled_p * (1 - pooled_p)) * (1/n1 + 1/n2)) ** 0.5
    
    # Calculate the z-score
    z_score = (p1 - p2) / se
    
    # Calculate the two-tailed p-value
    if test_type == test_type.TWO_SIDED:
        p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
    else:
        p_value = 1 - stats.norm.cdf(z_score)
    
    return p_value

def calculate_result_ci(p1: float, p2: float, n1: int, n2: int, alpha: float = 0.05, test_type: test_type = test_type.TWO_SIDED) -> tuple:
    """
    Calculate the confidence interval for the difference between two proportions.

    Args:
        p1 (float): Proportion of successes in group 1.
        p2 (float): Proportion of successes in group 2.
        n1 (int): Sample size of group 1.
        n2 (int): Sample size of group 2.
        alpha (float): Significance level (default is 0.05).

    Returns:
        tuple: Lower and upper bounds of the confidence interval.
    """
    # Calculate the standard error
    se = ((p1 * (1 - p1) / n1) + (p2 * (1 - p2) / n2)) ** 0.5
    
    # Calculate the critical z-value for the given alpha
    if test_type == test_type.TWO_SIDED:
        critical_z = stats.norm.ppf(1 - alpha / 2)
    else:
        critical_z = stats.norm.ppf(1 - alpha)
    
    # Calculate the margin of error
    margin_of_error = critical_z * se
    
    # Calculate the confidence interval
    ci_lower = (p1 - p2) - margin_of_error
    ci_upper = (p1 - p2) + margin_of_error
    
    return ci_lower, ci_upper

def calculate_uplift(p1: float, p2: float, mode: uplift_mode = uplift_mode.ABSOLUTE) -> float:
    """
    Calculate the uplift between two proportions.

    Args:
        p1 (float): Proportion of successes in group 1.
        p2 (float): Proportion of successes in group 2.

    Returns:
        float: The calculated uplift.
    """
    return p2 - p1 if mode == uplift_mode.ABSOLUTE else (p2 - p1) / p1 if p1 != 0 else float('inf')

def calculate_srm(n1: int, n2: int, expected_ratio: float = 0.5, alpha: float = 0.05) -> float:
    """
    Calculate the p-value for a Sample Ratio Mismatch (SRM) check between two groups.
    A caller should treat p < alpha as a significant mismatch.

    This is a chi-squared goodness-of-fit test on the two groups' sample
    *counts* against the expected allocation ratio -- it depends only on
    n1/n2, not on the metric being measured, so it's the same check for
    binary and continuous metrics alike.

    Args:
        n1 (int): Sample size of group 1.
        n2 (int): Sample size of group 2.
        expected_ratio (float): Expected share of total traffic allocated to group 1 (default is 0.5).
        alpha (float): Significance level (default is 0.05), kept for API compatibility.

    Returns:
        float: The chi-squared goodness-of-fit p-value for the observed sample ratio.
    """
    total_n = n1 + n2
    expected_n1 = total_n * expected_ratio
    expected_n2 = total_n * (1 - expected_ratio)

    # Calculate the chi-squared statistic
    chi_squared_stat = ((n1 - expected_n1) ** 2 / expected_n1) + ((n2 - expected_n2) ** 2 / expected_n2)

    # Convert the chi-squared statistic (df=1) to a p-value
    return 1 - stats.chi2.cdf(chi_squared_stat, df=1)

def _welch_satterthwaite_df(std1: float, n1: int, std2: float, n2: int) -> float:
    """
    Welch-Satterthwaite approximate degrees of freedom for two samples with
    unequal variances.
    """
    var1_term = std1 ** 2 / n1
    var2_term = std2 ** 2 / n2
    return (var1_term + var2_term) ** 2 / ((var1_term ** 2) / (n1 - 1) + (var2_term ** 2) / (n2 - 1))

def calculate_result_significance_continuous(mean1: float, mean2: float, std1: float, std2: float, n1: int, n2: int, alpha: float = 0.05, test_type: test_type = test_type.TWO_SIDED) -> bool:
    """
    Calculate the statistical significance of the difference between two means
    using Welch's t-test (does not assume equal variances).

    Args:
        mean1 (float): Mean of group 1.
        mean2 (float): Mean of group 2.
        std1 (float): Standard deviation of group 1.
        std2 (float): Standard deviation of group 2.
        n1 (int): Sample size of group 1.
        n2 (int): Sample size of group 2.
        alpha (float): Significance level (default is 0.05).

    Returns:
        bool: True if the difference is statistically significant, False otherwise.
    """
    se = ((std1 ** 2 / n1) + (std2 ** 2 / n2)) ** 0.5
    t_score = (mean1 - mean2) / se
    df = _welch_satterthwaite_df(std1, n1, std2, n2)

    if test_type == test_type.TWO_SIDED:
        critical_t = stats.t.ppf(1 - alpha / 2, df)
        return bool(abs(t_score) > critical_t)
    else:
        critical_t = stats.t.ppf(1 - alpha, df)
        return bool(t_score > critical_t)

def calculate_result_p_value_continuous(mean1: float, mean2: float, std1: float, std2: float, n1: int, n2: int, test_type: test_type = test_type.TWO_SIDED) -> float:
    """
    Calculate the p-value for the difference between two means using Welch's t-test.

    Args:
        mean1 (float): Mean of group 1.
        mean2 (float): Mean of group 2.
        std1 (float): Standard deviation of group 1.
        std2 (float): Standard deviation of group 2.
        n1 (int): Sample size of group 1.
        n2 (int): Sample size of group 2.

    Returns:
        float: The calculated p-value.
    """
    se = ((std1 ** 2 / n1) + (std2 ** 2 / n2)) ** 0.5
    t_score = (mean1 - mean2) / se
    df = _welch_satterthwaite_df(std1, n1, std2, n2)

    if test_type == test_type.TWO_SIDED:
        p_value = 2 * (1 - stats.t.cdf(abs(t_score), df))
    else:
        p_value = 1 - stats.t.cdf(t_score, df)

    return p_value

def calculate_result_ci_continuous(mean1: float, mean2: float, std1: float, std2: float, n1: int, n2: int, alpha: float = 0.05, test_type: test_type = test_type.TWO_SIDED) -> tuple:
    """
    Calculate the confidence interval for the difference between two means using Welch's t-test.

    Args:
        mean1 (float): Mean of group 1.
        mean2 (float): Mean of group 2.
        std1 (float): Standard deviation of group 1.
        std2 (float): Standard deviation of group 2.
        n1 (int): Sample size of group 1.
        n2 (int): Sample size of group 2.
        alpha (float): Significance level (default is 0.05).

    Returns:
        tuple: Lower and upper bounds of the confidence interval.
    """
    se = ((std1 ** 2 / n1) + (std2 ** 2 / n2)) ** 0.5
    df = _welch_satterthwaite_df(std1, n1, std2, n2)

    if test_type == test_type.TWO_SIDED:
        critical_t = stats.t.ppf(1 - alpha / 2, df)
    else:
        critical_t = stats.t.ppf(1 - alpha, df)

    margin_of_error = critical_t * se

    ci_lower = (mean1 - mean2) - margin_of_error
    ci_upper = (mean1 - mean2) + margin_of_error

    return ci_lower, ci_upper
